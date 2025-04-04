'use strict'

import sbp from '@sbp/sbp'
import './genericWorker.js'

const updatedSizeList = new Set()
const updatedSizeMap = new Map()
// TODO: Use something more fault tolerant, like periodic notifications
setTimeout(sbp, 30e3, 'backend/server/computeSizeTask')
setTimeout(sbp, 30e3, 'backend/server/computeSizeTaskDeltas')

const updateSize = async (resourceID: string, sizeKey: string, size: number) => {
  if (!Number.isSafeInteger(size)) {
    throw new TypeError(`Invalid given size ${size} for ${resourceID}`)
  }
  // Use a queue to ensure atomic updates
  await sbp('okTurtles.eventQueue/queueEvent', sizeKey, async () => {
    // Size is stored as a decimal value
    const existingSize = parseInt(await sbp('chelonia.db/get', sizeKey, { bypassCache: true }) ?? '0', 10)
    if (!(existingSize >= 0)) {
      throw new TypeError(`Invalid stored size ${existingSize} for ${resourceID}`)
    }
    const updatedSize = existingSize + size
    if (!(updatedSize >= 0)) {
      throw new TypeError(`Invalid stored updated size ${updatedSize} for ${resourceID}`)
    }
    await sbp('chelonia.db/set', sizeKey, updatedSize.toString(10))
  })
}

sbp('sbp/selectors/register', {
  'worker/updateSizeSideEffects': ({ resourceID, sizeKey, size }: { resourceID: string, sizeKey: string, size: number }) => {
    updatedSizeList.add(resourceID)
    if (sizeKey.startsWith('_private_size_')) {
      const current = updatedSizeMap.get(resourceID) || 0
      updatedSizeMap.set(resourceID, current + size)
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
      const val = ultimateOwners.get(ownerID) || 0
      ultimateOwners.set(ownerID, val + delta)
    }))
    await Promise.all(Array.from(ultimateOwners).map(([id, delta]) => {
      return updateSize(id, `_private_0wnerTotalSize_${id}`, delta)
    }))
    // TODO: Use something more fault tolerant, like periodic notifications
    setTimeout(sbp, 30e3, 'backend/server/computeSizeTaskDeltas')
  },
  'backend/server/computeSizeTask': async function () {
    const contractIDs = Array.from(updatedSizeList)
    updatedSizeList.clear()
    const ultimateOwnersSet = new Set(await Promise.all(contractIDs.map(async (contractID) => {
      let ownerID = contractID
      for (;;) {
        const newOwnerID = await sbp('chelonia.db/get', `_private_owner_${ownerID}`)
        if (!newOwnerID) break
        ownerID = newOwnerID
      }
      return ownerID
    })))
    await Promise.all(Array.from(ultimateOwnersSet).map(async (resourceID) => {
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
      await sbp('chelonia.db/set', `_private_ownerTotalSize_${resourceID}`, totalSize.toString(10))
    }))
    // TODO: Use something more fault tolerant, like periodic notifications
    setTimeout(sbp, 30e3, 'backend/server/computeSizeTask')
  }
})
