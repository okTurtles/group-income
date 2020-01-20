import sbp from '~/shared/sbp.js'
import { CONTRACT_IS_SYNCING } from '@utils/events.js'

export default sbp('sbp/selectors/register', {
  'gi.actions/contract/subscribe': async function (contractIDs: string | array) {
    const listOfIds = typeof contractIDs === 'string' ? [contractIDs] : contractIDs

    for (const id of listOfIds) {
      await sbp('state/enqueueContractSync', id)
    }
  },
  'gi.actions/contract/subscribeAndWait': async function (contractIDs: string | array) {
    const listOfIds = typeof contractIDs === 'string' ? [contractIDs] : contractIDs

    // QUESTION: Need help here... I didn't understand exactly the instructions to make
    // this work when it comes to Promise.all.
    for (const id of listOfIds) {
      sbp('okTurtles.events/emit', CONTRACT_IS_SYNCING, id, true)
      await sbp('gi.actions/contract/subscribe', id)
      sbp('okTurtles.events/emit', CONTRACT_IS_SYNCING, id, false)
    }
  }
})
