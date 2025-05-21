'use strict'

import sbp from '@sbp/sbp'
import { OWNER_SIZE_TOTAL_WORKER_TASK_TIME_INTERVAL as TASK_TIME_INTERVAL } from './constants.js'
import { appendToIndexFactory, lookupUltimateOwner, removeFromIndexFactory, updateSize } from './database.js'
import { readyQueueName } from './genericWorker.js'

// This file defines two different methods for doing size computations:
// `backend/server/computeSizeTaskDeltas` and `backend/server/computeSizeTask`.
// The latter does a full computation by looking at all subresources and adding
// them up while the former does a delta-based computation and is event-driven.
// Both are used, but at different times.
// The delta / event-driven version is likely to be the most performant while
// the server is running, so this is used for updates.
// However, the full computation is less likely to give incorrect results and
// requires fewer pieces of data to be stored. This is what's used when the
// server starts up.
// Because the delta version could theoretically lead to incorrect results
// (meaning it's not self-healing), we mighr want in the future to also randomly
// do a full computation on some contracts.

const updatedSizeList = new Set()
const updatedSizeMap = new Map()
const cachedUltimateOwnerMap = new Map()

// Super-fast 8-bit hash for base58 with low bucket size standard deviation
//  (i.e., the 256 buckets get about the same number of elements)
const fastBase58Hash = (cid: string) => {
  const len = cid.length
  const a = cid.codePointAt(len - 2) || 0
  const b = cid.codePointAt(len - 1) || 0
  return ((a * 19) + (b + 19)) & 0xFF
}

/**
 * Appends a CID to its corresponding temporary index bucket in the database.
 * This marks the CID as needing processing in the next delta calculation.
 * @param cid The CID to add to the temporary index.
 * @returns Promise resolving when the append operation completes.
 */
const addToTempIndex = (cid: string) => {
  return appendToIndexFactory(`_private_pendingIdx_ownerTotalSize_${fastBase58Hash(cid)}`)(cid)
}

/**
 * Removes multiple CIDs from their respective temporary index buckets.
 * Groups CIDs by bucket for efficient batch removal.
 * @param cids An array of CIDs to remove.
 * @returns Promise resolving when all removal operations complete.
 */
const removeFromTempIndex = (cids: string[]) => {
  // 1. Group CIDs by their hash bucket.
  const cidsByBucket = cids.reduce((acc: Map<number, Set<string>>, cv: string) => {
    const bucket = fastBase58Hash(cv)
    const ownedResourcesSet = acc.get(bucket)
    if (ownedResourcesSet) {
      ownedResourcesSet.add(cv)
    } else {
      acc.set(bucket, new Set([cv]))
    }
    return acc
  }, new Map())

  // 2. Create removal promises for each bucket. Execute all removal
  // operations concurrently.
  return Promise.all([...cidsByBucket].map(([bucket, cids]) => {
    return removeFromIndexFactory(`_private_pendingIdx_ownerTotalSize_${bucket}`)([...cids])
  }))
}

/**
 * Runs once on worker startup or initialization.
 * It loads all CIDs from the persistent temporary index buckets into the
 * in-memory `updatedSizeList`.
 * These CIDs represent items needing a full recalculation (potentially from a
 * previous unclean shutdown).
 */
sbp('okTurtles.eventQueue/queueEvent', readyQueueName, async () => {
  // Iterate through all 256 possible bucket keys.
  for (let i = 0; i < 256; i++) {
    // Fetch the content of the bucket
    // (bypassCache isn't really needed here as the cache should be empty, but
    // it's added for clarity.)
    const data = await sbp('chelonia.db/get', `_private_pendingIdx_ownerTotalSize_${i}`, { bypassCache: true })
    if (data) {
      // Split the string and add mark each CID as requiring full recalculation
      data.split('\x00').forEach((cid) => {
        updatedSizeList.add(cid)
      })
    }
  }

  console.info(`[ownerSizeTotalWorker] Loaded ${updatedSizeList.size} CIDs for full recalculation.`)
  if (updatedSizeList.size) {
    sbp('backend/server/computeSizeTask')
  }

  // Schedule the recurring delta computation task
  setTimeout(sbp, TASK_TIME_INTERVAL, 'backend/server/computeSizeTaskDeltas')
})

sbp('sbp/selectors/register', {
  /**
   * Selector: 'worker/updateSizeSideEffects'
   * Handles incoming size update events for a specific resource.
   * It adds the CID to the temporary persistent index (if not already processed
   * or pending full recalc) and updates the in-memory delta map (`updatedSizeMap`).
   *
   * IMPORTANT: This should only be called for keys where this is relevant,
   * such as `_private_size_` keys.
   */
  'worker/updateSizeSideEffects': async ({ resourceID, size, ultimateOwnerID }: { resourceID: string, size: number, ultimateOwnerID?: string }) => {
    // Ignore if the resource is already flagged for a full recalculation.
    // Its size will be fully computed in `computeSizeTask`.
    if (updatedSizeList.has(resourceID)) return

    const current = updatedSizeMap.get(resourceID)
    if (current === undefined) {
      // First delta update for this resourceID since the last delta task ran.
      // Add it to the persistent temporary index to ensure it's processed
      // even if the worker restarts.
      try {
        await addToTempIndex(ultimateOwnerID || resourceID)
        // Store the initial delta size.
        updatedSizeMap.set(resourceID, size)
      } catch (e) {
        console.error(e, `[ownerSizeTotalWorker] Error adding ${resourceID} to temp index:`)
      }
    } else {
      // Accumulate subsequent delta updates in memory.
      updatedSizeMap.set(resourceID, current + size)
    }
    if (ultimateOwnerID) {
      cachedUltimateOwnerMap.set(resourceID, ultimateOwnerID)
    }
  },
  /**
   * Selector: 'backend/server/computeSizeTaskDeltas'
   * Periodically executed task (via setTimeout) to process accumulated
   * size _deltas_.
   * Calculates the change in total size for ultimate owners based on the deltas
   * stored in `updatedSizeMap` and updates the database.
   */
  'backend/server/computeSizeTaskDeltas': async function () {
    // Capture the current set of deltas and clear the map for the next interval
    const deltaEntries = Array.from(updatedSizeMap)
    // Clear immediately to start accumulating new deltas.
    updatedSizeMap.clear()

    // Map to store: ultimateOwnerID -> [totalDelta, Set<originalResourceIDs>]
    const ultimateOwners = new Map()
    // Phase 1: Find the ultimate owner for each resource and aggregate deltas.
    await Promise.all(deltaEntries.map(async ([contractID, delta]) => {
      // --- Potentially Slow Owner Lookup Loop ---
      const ownerID = cachedUltimateOwnerMap.get(contractID) || await lookupUltimateOwner(contractID)
      cachedUltimateOwnerMap.delete(contractID)
      // Aggregate delta for the ultimate owner.
      const [val, ownedResourcesSet] = ultimateOwners.get(ownerID) || [0, new Set(ownerID)]
      ownedResourcesSet.add(contractID)
      ultimateOwners.set(ownerID, [val + delta, ownedResourcesSet])
    }))

    // Phase 2: Apply the aggregated deltas to the database and clean up
    // the temporary index.
    await Promise.all(Array.from(ultimateOwners).map(async ([id, [totalDelta, contributingResources]]) => {
      // Apply the calculated delta to the owner's total size record in the DB
      await updateSize(id, `_private_ownerTotalSize_${id}`, totalDelta)
      // Remove the processed resource IDs from the persistent temporary index
      await removeFromTempIndex(Array.from(contributingResources))
    }))

    // Reschedule the task for the next interval
    setTimeout(sbp, TASK_TIME_INTERVAL, 'backend/server/computeSizeTaskDeltas')
  },
  /**
   * Selector: 'backend/server/computeSizeTask'
   * Task to perform a full recalculation of total owner sizes.
   * Triggered on startup if `updatedSizeList` is populated (from
   * persistent index).
   * Processes resource IDs from `updatedSizeList`.
   */
  'backend/server/computeSizeTask': async function () {
    const start = performance.now()
    // Capture the current list and clear it
    const resourcesToRecalculate = Array.from(updatedSizeList)
    // Clear should happen *after* successful processing per owner below:
    // // updatedSizeList.clear();

    // Map to store: ultimateOwnerID -> Set<resourceIDs belonging to this owner>
    const ultimateOwners = new Map()

    // Phase 1: Find the ultimate owner for each resource ID needing recalc
    await Promise.all(resourcesToRecalculate.map(async (contractID) => {
      // --- Potentially Slow Owner Lookup Loop ---
      const ownerID = await lookupUltimateOwner(contractID)
      // Group resources by their ultimate owner.
      const resources = ultimateOwners.get(ownerID)
      if (resources) {
        resources.add(contractID)
      } else {
        ultimateOwners.set(ownerID, new Set([contractID]))
      }
    }))

    // Phase 2: For each owner, fetch all their resources and calculate the
    // total size.
    await Promise.all(Array.from(ultimateOwners).map(async ([ownerID, contractIDs]) => {
      // Fetch direct and indirect resources associated with the ultimate owner
      const resources = await sbp('chelonia.db/get', `_private_resources_${ownerID}`)
      const indirectResources = resources ? await sbp('chelonia.db/get', `_private_indirectResources_${ownerID}`) : undefined
      // Combine the owner itself, direct, and indirect resources into a single unique list.
      const allSubresources = Array.from(new Set([
        ownerID,
        ...(resources ? resources.split('\x00') : []),
        ...(indirectResources ? indirectResources.split('\x00') : [])
      ]))
      // Fetch the size of each sub-resource concurrently
      // NB! There can be potentially many DB reads
      const totalSize = (await Promise.all(allSubresources.map((id) => {
        return sbp('chelonia.db/get', `_private_size_${id}`)
      }))).reduce((acc, cv, i) => {
        if (cv) {
          // Sum the sizes (parsing string values).
          const parsed = parseInt(cv, 10)
          if (parsed) return parsed + acc
        }
        return acc
        // Start accumulation (sum) at 0
      }, 0)

      // Use event queue for atomic update and cleanup for this specific owner.
      // This prevents race conditions if multiple updates target the same owner
      // concurrently (though less likely in the full recalc).
      await sbp('okTurtles.eventQueue/queueEvent', `_private_ownerTotalSize_${ownerID}`, async () => {
        // 1. Remove processed resources from the global lists/maps.
        allSubresources.forEach((id) => {
          // Remove from full recalc list
          updatedSizeList.delete(id)
          // If it's since received a delta update and added to updatedSizeMap,
          // remove it from updatedSizeMap so that no delta computation happens
          // (as we've just finished a full calculation)
          if (updatedSizeMap.delete(id)) {
            contractIDs.add(id)
          }
        })

        // 2. Update the total size in the database.
        await sbp('chelonia.db/set', `_private_ownerTotalSize_${ownerID}`, totalSize.toString(10))

        // 3. Remove the recalculated CIDs from the persistent temporary index
        // (unless they've been readded due to deltas)
        await removeFromTempIndex(Array.from(contractIDs).filter(id => {
          // Since updating ownerTotalSize, a new delta update could have been
          // received, in which case we don't want to call removeFromTempIndex
          // on this contract, as it's a new update that wasn't part of the
          // full computation.
          return !updatedSizeMap.has(id)
        }))
      })
    }))

    console.info(`[ownerSizeTotalWorker] Computed size for ${updatedSizeList.size} CIDs in ${((performance.now() - start) / 1000).toFixed(2)} seconds.`)
  }
})
