'use strict'

// Plain, dependency-free helper (no `sbp`, no Vuex) so it's trivial to
// unit test and safe to call from code that runs before/outside the
// Vuex store is fully wired up.
//
// Given the app's root state and the ID of some contract, figure out
// which group (if any) that contract belongs to. A contract "belongs" to
// a group when either:
//   (a) it *is* the group's own contract, or
//   (b) it's a chat room owned by that group.
//
// Used to scope notifications (e.g. contract-processing errors) to the
// group they're actually relevant to, instead of showing them everywhere.
// See: https://github.com/okTurtles/group-income/issues/2567
export function findGroupIdForContract (rootState: Object, contractID: ?string): string | void {
  const contracts = rootState?.contracts || {}
  if (!contractID || !contracts[contractID]) return undefined

  if (contracts[contractID].type === 'gi.contracts/group') {
    return contractID
  }

  return Object.keys(contracts).find(groupID => {
    return contracts[groupID]?.type === 'gi.contracts/group' &&
      Object.keys(rootState[groupID]?.chatRooms || {}).includes(contractID)
  })
}
