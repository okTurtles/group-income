import sbp from '~/shared/sbp.js'

export default sbp('sbp/selectors/register', {
  'gi.sideEffects/group/removeMember': async function ({ username, groupId }) {
    const rootState = sbp('state/vuex/state')
    const contracts = rootState.contracts || {}

    if (username === rootState.loggedIn.username) {
      // If this member is re-joining the group, ignore the rest
      // so the member doesn't remove themself again.
      if (sbp('okTurtles.data/get', 'JOINING_GROUP')) {
        return
      }

      const groupIdToSwitch = Object.keys(contracts)
        .find(contractID => contracts[contractID].type === 'group' &&
              contractID !== groupId &&
              rootState[contractID].settings) || null

      sbp('state/vuex/commit', 'setCurrentGroupId', groupIdToSwitch)
      sbp('state/vuex/commit', 'removeContract', groupId)
      sbp('controller/router').push({ path: groupIdToSwitch ? '/dashboard' : '/' })
      // TODO - #828 remove other group members contracts if applicable
    } else {
      // TODO - #828 remove the member contract if applicable.
      // sbp('state/vuex/commit', 'removeContract', data.memberID)
    }
    // TODO - #850 verify open proposals and see if they need some re-adjustment.
  }
})
