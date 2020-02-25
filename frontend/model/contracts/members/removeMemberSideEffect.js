'use strict'

import sbp from '~/shared/sbp.js'

export default async function removeMemberSideEffect (data) {
  const rootState = sbp('state/vuex/state')
  const contracts = rootState.contracts || {}

  if (data.member === rootState.loggedIn.username) {
    // If this member is re-joining the group, ignore the rest
    // so the member doesn't remove themself again.
    if (sbp('okTurtles.data/get', 'JOINING_GROUP')) {
      return
    }

    const groupIdToSwitch = Object.keys(contracts)
      .find(contractID => contracts[contractID].type === 'group' &&
        contractID !== data.groupId &&
        rootState[contractID].settings) || null
    sbp('state/vuex/commit', 'setCurrentGroupId', groupIdToSwitch)
    sbp('state/vuex/commit', 'removeContract', data.groupId)

    sbp('state/router').push({ path: groupIdToSwitch ? '/dashboard' : '/' })
    // TODO - #828 remove other group members contracts if applicable
  } else {
    // TODO - #828 remove the member contract if applicable.
    // sbp('state/vuex/commit', 'removeContract', data.memberID)
  }
  // TODO - verify open proposals and see if they need some re-adjustments.
  // ex 3 of 4 members voted -> one member left -> 3 of 3 members voted -> need to resync and mark it as passed!
}
