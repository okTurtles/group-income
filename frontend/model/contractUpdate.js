'use strict'

import sbp from '@sbp/sbp'

// Whether some of the contracts listed in `contractIDHints` could be of one of
// `contractTypes`, according to `state.contracts`. Without hints, every
// contract counts. This lets `contractUpdate` skip an update (and, in a tab, a
// call to the service worker) when none of the existing contracts is of a type
// that the update is for. Contracts whose type isn't known count, to be safe.
export const mayIncludeContractTypes = (state: ?Object, contractIDHints: ?string[], contractTypes: string[]): boolean => {
  if (!Array.isArray(contractIDHints)) return true
  return contractIDHints.some((contractID) => {
    const type = state?.contracts?.[contractID]?.type
    return type == null || contractTypes.includes(type)
  })
}

// Wrapper function for performing contract upgrades and migrations over the
// contracts in `initialState`, once they're ready. Contracts synced later on
// are watched elsewhere (e.g., the `CONTRACTS_MODIFIED` handler in
// `frontend/controller/actions/chatroom.js`, in the service worker, rather
// than once per open tab).
export const contractUpdate = (
  initialState: Object,
  updateFn: (state: Object, contractIDHints: ?string[]) => any,
  contractTypes: ?(string | string[])
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

  // Call the update function in the next tick
  // We want this (in addition to any `CONTRACTS_MODIFIED` handlers) because
  // this way we can update contracts that already exist, e.g., upon login
  // with a saved state
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
