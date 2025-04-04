'use strict'

import sbp from '@sbp/sbp'
import { appendToIndexFactory, removeFromIndexFactory, updateSize } from './database.js'
import './genericWorker.js'

const updatedSizeList = new Set()
const updatedSizeMap = new Map()
setTimeout(sbp, 30e3, 'backend/server/computeSizeTaskDeltas')

// Super-fast 8-bit hash for base58 with low standard deviation
const fastBase58Hash = (cid: string) => {
  const hash = ((cid.codePointAt(cid.length - 2) * 19) + (cid.codePointAt(cid.length - 1) + 19)) & 0xFF
  return hash
}

const addToTempIndex = (cid: string) => {
  return appendToIndexFactory(`_private_pendingIdx_ownerTotalSize_${fastBase58Hash(cid)}`)(cid)
}

const removeFromTempIndex = (cids: string[]) => {
  return Promise.all([...cids.reduce((acc: Map, cv) => {
    const bucket = fastBase58Hash(cv)
    const set = acc.get(bucket)
    if (set) {
      set.add(cv)
    } else {
      acc.set(bucket, new Set([cv]))
    }
    return acc
  }, new Map())].map(([bucket, cids]) => {
    return removeFromIndexFactory(`_private_pendingIdx_ownerTotalSize_${bucket}`)([...cids])
  }))
}

sbp('okTurtles.eventQueue/queueEvent', 'parentPort', async () => {
  for (let i = 0; i < 256; i++) {
    const data = await sbp('chelonia.db/get', `_private_pendingIdx_ownerTotalSize_${i}`)
    if (data) {
      data.split('\x00').forEach((cid) => {
        updatedSizeList.add(cid)
      })
    }
  }
  sbp('backend/server/computeSizeTask')
})

sbp('sbp/selectors/register', {
  'worker/updateSizeSideEffects': ({ resourceID, sizeKey, size }: { resourceID: string, sizeKey: string, size: number }) => {
    if (updatedSizeList.has(resourceID)) return
    if (sizeKey.startsWith('_private_size_')) {
      const current = updatedSizeMap.get(resourceID)
      if (current === undefined) {
        addToTempIndex(resourceID).catch((e) => {
          // TODO
        })
        updatedSizeMap.set(resourceID, size)
      } else {
        updatedSizeMap.set(resourceID, current + size)
      }
    }
  },
  'backend/server/computeSizeTaskDeltas': async function () {
    const contractIDs = Array.from(updatedSizeMap)
    updatedSizeMap.clear()
    const ultimateOwners = new Map()
    await Promise.all(contractIDs.map(async ([contractID, delta]) => {
      let ownerID = contractID
      for (;;) {
        const newOwnerID = await sbp('chelonia.db/get', `_private_owner_${ownerID}`, { bypassCache: true })
        if (!newOwnerID) break
        ownerID = newOwnerID
      }
      const [val, set] = ultimateOwners.get(ownerID) || [0, new Set()]
      set.add(contractID)
      ultimateOwners.set(ownerID, [val + delta, set])
    }))
    await Promise.all(Array.from(ultimateOwners).map(async ([id, [delta, set]]) => {
      await updateSize(id, `_private_ownerTotalSize_${id}`, delta)
      await removeFromTempIndex(Array.from(set))
    }))
    setTimeout(sbp, 30e3, 'backend/server/computeSizeTaskDeltas')
  },
  'backend/server/computeSizeTask': async function () {
    const contractIDs = Array.from(updatedSizeList)
    const ultimateOwners = new Map()
    await Promise.all(contractIDs.map(async (contractID) => {
      let ownerID = contractID
      for (;;) {
        const newOwnerID = await sbp('chelonia.db/get', `_private_owner_${ownerID}`, { bypassCache: true })
        if (!newOwnerID) break
        ownerID = newOwnerID
      }
      const set = ultimateOwners.get(ownerID)
      if (set) {
        set.add(contractID)
      } else {
        ultimateOwners.set(ownerID, new Set([contractID]))
      }
    }))
    await Promise.all(Array.from(ultimateOwners).map(async ([resourceID, contractIDs]) => {
      const resources = await sbp('chelonia.db/get', `_private_resources_${resourceID}`)
      const indirectResources = resources ? await sbp('chelonia.db/get', `_private_indirectResources_${resourceID}`) : undefined
      const allSubresources = Array.from(new Set([
        resourceID,
        ...(resources ? resources.split('\x00') : []),
        ...(indirectResources ? indirectResources.split('\x00') : [])
      ]))
      const totalSize = (await Promise.all(allSubresources.map((id) => {
        return sbp('chelonia.db/get', `_private_size_${id}`)
      }))).reduce((acc, cv, i) => {
        if (cv) {
          const parsed = parseInt(cv, 10)
          if (parsed) return parsed + acc
        }
        return acc
      }, 0)
      await sbp('okTurtles.eventQueue/queueEvent', `_private_ownerTotalSize_${resourceID}`, async () => {
        allSubresources.forEach((id) => {
          updatedSizeList.delete(id)
          if (updatedSizeMap.delete(id)) {
            contractIDs.add(id)
          }
        })
        await sbp('chelonia.db/set', `_private_ownerTotalSize_${resourceID}`, totalSize.toString(10))
        await removeFromTempIndex(Array.from(contractIDs).filter(id => {
          return !updatedSizeMap.has(id)
        }))
      })
    }))
  }
})
