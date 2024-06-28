// This file provides utility functions that are local regardless of whether
// Chelonia is running in a different context and calls are being forwarded
// using `chelonia/*`
import { cloneDeep } from '@model/contracts/shared/giLodash.js'
import sbp from '@sbp/sbp'
import { CONTRACTS_MODIFIED, EVENT_HANDLED, EVENT_HANDLED_READY } from './events.js'

export default (sbp('sbp/selectors/register', {
  // This selector sets up event listeners on EVENT_HANDLED and CONTRACTS_MODIFIED
  // to keep Chelonia state in sync with some external state (e.g., Vuex).
  // This needs to be called from the context that owns this external state
  // (e.g., the tab in which the app is running) and because 'full' Chelonia may
  // be available in this context, we cannot use `chelonia/configure`.
  // _If there is no external state to be kept in sync with Chelonia, this selector doesn't need to be called_
  //
  // For example, **if Chelonia is running on a service worker**, the following
  // would be done.
  // 1. The service worker calls `chelonia/configure` and forwards EVENT_HANDLED
  //    and CONTRACTS_MODIFIED events to all clients (tabs)
  //    Note: `chelonia/configure` is called by the context running Chelonia
  // 2. Each tab uses `chelonia/*` to forward calls to Chelonia to the SW.
  //    Note: Except selectors defined in this file
  // 3. Each tab calls this selector once to set up event listeners on EVENT_HANDLED
  //    and CONTRACTS_MODIFIED, which will keep each tab's state updated every
  //    time Chelonia handles an event.
  'chelonia/externalStateSetup': ({ reactiveSet, reactiveDel } = {
    reactiveSet: Reflect.set.bind(Reflect),
    reactiveDel: Reflect.deleteProperty.bind(Reflect)
  }) => {
    sbp('okTurtles.events/on', EVENT_HANDLED, async (contractID, message) => {
      const { contractState, cheloniaState } = await sbp('chelonia/contract/fullState', contractID)
      const vuexState = sbp('state/vuex/state')
      if (cheloniaState) {
        if (!vuexState.contracts) {
          reactiveSet(vuexState, 'contracts', Object.create(null))
        }
        reactiveSet(vuexState.contracts, contractID, cloneDeep(cheloniaState))
      } else if (vuexState.contracts) {
        reactiveDel(vuexState.contracts, contractID)
      }
      if (contractState) {
        reactiveSet(vuexState, contractID, cloneDeep(contractState))
      } else {
        reactiveDel(vuexState, contractID)
      }

      // This EVENT_HANDLED_READY event lets the current context (e.g., tab)
      // know that an event has been processed _and_ committed to the state
      // (as opposed to EVENT_HANDLED, which means the event was processed by
      // _Chelonia_ but state changes may not be reflected in the current tab
      // yet).
      sbp('okTurtles.events/emit', EVENT_HANDLED_READY, contractID, message)
    })

    sbp('okTurtles.events/on', CONTRACTS_MODIFIED, async (subscriptionSet) => {
      const states = await sbp('chelonia/contract/fullState', subscriptionSet)
      const vuexState = sbp('state/vuex/state')

      if (!vuexState.contracts) {
        reactiveSet(vuexState, 'contracts', Object.create(null))
      }

      const oldContracts = Object.keys(vuexState.contracts)
      const oldContractsToRemove = oldContracts.filter(x => !subscriptionSet.includes(x))
      const newContracts = subscriptionSet.filter(x => !oldContracts.includes(x))

      oldContractsToRemove.forEach(contractID => {
        reactiveDel(vuexState.contracts, contractID)
        reactiveDel(vuexState, contractID)
      })
      newContracts.forEach(contractID => {
        const { contractState, cheloniaState } = states[contractID]
        if (cheloniaState) {
          reactiveSet(vuexState.contracts, contractID, cloneDeep(cheloniaState))
        }
        if (contractState) {
          reactiveSet(vuexState, contractID, cloneDeep(contractState))
        }
      })
    })
  }
}): string[])
