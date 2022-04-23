import sbp from '@sbp/sbp'
import { CONTRACT_IS_SYNCING } from '@utils/events.js'

export default (sbp('sbp/selectors/register', {
  'gi.actions/contract/sync': async function (contractIDs: string | string[]) {
    const listOfIds = typeof contractIDs === 'string' ? [contractIDs] : contractIDs

    for (const id of listOfIds) {
      await sbp('state/enqueueContractSync', id)
    }
  },
  'gi.actions/contract/syncAndWait': function (contractIDs: string | string[]) {
    const listOfIds = typeof contractIDs === 'string' ? [contractIDs] : contractIDs

    const promises = listOfIds.map(id => new Promise((resolve, reject) => {
      const isDoneSyncing = (contractID, isSyncing) => {
        if (isSyncing === false && contractID === id) {
          sbp('okTurtles.events/off', CONTRACT_IS_SYNCING, isDoneSyncing)
          resolve(id)
        }
      }
      sbp('okTurtles.events/on', CONTRACT_IS_SYNCING, isDoneSyncing)
      sbp('state/enqueueContractSync', id)
    }))

    return Promise.all(promises)
  }
}): any)
