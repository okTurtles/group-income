'use strict'

import sbp from '@sbp/sbp'
import { CHELONIA_RESET, CONTRACTS_MODIFIED } from '@chelonia/lib/events'

// Whether some of the contracts listed in `contractIDHints` could be of one of
// `contractTypes`, according to `state.contracts`. Without hints, every
// contract counts. Contracts whose type isn't known yet count as well: a newly
// synced contract can reach a tab after `chelonia/contract/wait` resolves.
export const mayIncludeContractTypes = (state: Object, contractIDHints: ?string[], contractTypes: string[]): boolean => {
  if (!Array.isArray(contractIDHints)) return true
  return contractIDHints.some((contractID) => {
    const type = state?.contracts?.[contractID]?.type
    return type == null || contractTypes.includes(type)
  })
}

// Wrapper function for performing contract upgrades and migrations
// The update function is called for the contracts in `initialState` and, if
// `watch` is set (the default), again whenever new contracts are synced, until
// the next Chelonia reset (i.e., for the current session).
export const contractUpdate = (
  initialState: Object,
  updateFn: (state: Object, contractIDHints: ?string[]) => any,
  contractTypes: ?(string | string[]),
  { watch = true }: { watch?: boolean } = {}
) => {
  // Wrapper for the update function. This performs a common check, namely that
  // the contracts could be of one of the given types, which helps return early
  // (in a tab, this also saves a call to the service worker).
  const normalizedTypes = typeof contractTypes === 'string' ? [contractTypes] : contractTypes
  const wrappedUpdateFn = normalizedTypes
  // The following disable is because eslint gets confused with 'Object'
  // eslint-disable-next-line no-use-before-define
    ? (state: Object, contractIDHints: ?string[]) => {
        if (!mayIncludeContractTypes(state, contractIDHints, normalizedTypes)) return
        updateFn(state, contractIDHints)
      }
    : updateFn

  if (watch) {
    const resetHandler = () => {
      sbp('okTurtles.events/off', CONTRACTS_MODIFIED, modifiedHandler)
    }
    // This function is called when the set of subscribed contracts is modified
    const modifiedHandler = (_, { added }) => {
      // Wait for the added contracts to be ready, then call the update function
      if (!added.length) return
      sbp('chelonia/contract/wait', added).then(() => {
        const state = sbp('state/vuex/state')
        wrappedUpdateFn(state, added)
      }).catch((e) => {
        console.error('[contractUpdate] Error updating newly added contracts', e)
      })
    }

    // Add event listeners for `CONTRACTS_MODIFIED` and `CHELONIA_RESET` events
    // `CONTRACTS_MODIFIED` is the important event. This is what allows updating
    // contracts that are newly synced (for example, when logging in for the
    // first time or joining an existing group or chatroom)
    sbp('okTurtles.events/on', CONTRACTS_MODIFIED, modifiedHandler)
    // Receiving `CHELONIA_RESET` means that a new session has started. To prevent
    // memory leaks and duplicate handlers, this event will remove the
    // `CONTRACTS_MODIFIED` handler.
    sbp('okTurtles.events/once', CHELONIA_RESET, resetHandler)
  }

  // Call the update function in the next tick
  // We want this (in addition to `CONTRACTS_MODIFIED`) because this way we
  // can update contracts that already exist, e.g., upon login with a saved
  // state
  const existingContracts = Object.keys(initialState.contracts)
  setTimeout(() => {
    sbp('chelonia/contract/wait', existingContracts).then(() => {
      const state = sbp('state/vuex/state')
      wrappedUpdateFn(state, existingContracts)
    }).catch((e) => {
      console.error('[contractUpdate] Error updating existing contracts', e)
    })
  }, 0)
}
