'use strict'

import { L } from '@common/common.js'
import {
  INVITE_INITIAL_CREATOR,
  MAX_GROUP_MEMBER_COUNT
} from '@model/contracts/shared/constants.js'
import sbp from '@sbp/sbp'
import { JOINED_GROUP, LEFT_GROUP, NEW_LAST_LOGGED_IN, OPEN_MODAL, REPLACE_MODAL, SWITCH_GROUP } from '@utils/events.js'
import ALLOWED_URLS from '@view-utils/allowedUrls.js'
import type { ChelKeyRequestParams } from '~/shared/domains/chelonia/chelonia.js'
import type { GIActionParams } from '../actions/types.js'

// handle incoming group-related events that are sent from the service worker
sbp('okTurtles.events/on', JOINED_GROUP, ({ identityContractID, groupContractID }) => {
  const rootState = sbp('state/vuex/state')
  if (rootState.loggedIn?.identityContractID !== identityContractID) return
  if (!rootState[groupContractID]) return
  if (!rootState.currentGroupId) {
    sbp('state/vuex/commit', 'setCurrentGroupId', { contractID: groupContractID })
    sbp('state/vuex/commit', 'setCurrentChatRoomId', {})
  }
})

sbp('okTurtles.events/on', LEFT_GROUP, ({ identityContractID, groupContractID }) => {
  const rootState = sbp('state/vuex/state')
  if (rootState.loggedIn?.identityContractID !== identityContractID) return
  const state = rootState[identityContractID]
  // grab the groupID of any group that we're a part of
  const currentGroupId = rootState.currentGroupId
  if (!currentGroupId || currentGroupId === groupContractID) {
    const groupIdToSwitch = Object.entries(state.groups)
      // $FlowFixMe[incompatible-use]
      .map(([cID, { hasLeft }]) => !hasLeft && cID)
      .filter(cID =>
        cID && cID !== groupContractID
      ).sort(cID =>
      // prefer successfully joined groups
        sbp('state/vuex/state')[cID]?.profiles?.[groupContractID] ? -1 : 1
      )[0] || null
    sbp('state/vuex/commit', 'setCurrentChatRoomId', {})
    // If currentGroupId === groupContractID (i.e., if the current group is
    // the one being left), we set `forceRefresh` to force a redirect to the
    // dashboard route. This closes the modal for leaving a group if it was
    // open.
    sbp('state/vuex/commit', 'setCurrentGroupId', { contractID: groupIdToSwitch, forceRefresh: currentGroupId === groupContractID })
  }
})

sbp('okTurtles.events/on', NEW_LAST_LOGGED_IN, ([contractID, data]) => {
  sbp('state/vuex/commit', 'setLastLoggedIn', [contractID, data])
})

export default (sbp('sbp/selectors/register', {
  'gi.app/group/createAndSwitch': async function (params: GIActionParams) {
    const contractID = await sbp('gi.actions/group/create', params)
    sbp('gi.app/group/switch', contractID, true)
    return contractID
  },
  'gi.app/group/switch': function (groupId, isNewlyCreated) {
    sbp('okTurtles.events/emit', SWITCH_GROUP, { contractID: groupId, isNewlyCreated })
    sbp('state/vuex/commit', 'setCurrentGroupId', { contractID: groupId, isNewlyCreated })
  },
  'gi.app/group/joinAndSwitch': async function (params: $Exact<ChelKeyRequestParams>) {
    await sbp('gi.actions/group/join', params)
    // after joining, we can set the current group
    return sbp('gi.app/group/switch', params.contractID, true)
  },
  'gi.app/group/joinWithInviteSecret': async function (groupId: string, secret: string) {
    const result = await sbp('gi.actions/group/joinWithInviteSecret', groupId, secret)
    sbp('gi.app/group/switch', groupId, true)
    return result
  },
  'gi.app/group/addAndJoinChatRoom': async function (params: GIActionParams) {
    const chatRoomID = await sbp('gi.actions/group/addAndJoinChatRoom', params)
    // For an explanation about 'setPendingChatRoomId', see DMMixin.js
    // TL;DR: This is an intermediary state to avoid untimely navigation before
    // the contract state is available.
    sbp('state/vuex/commit', 'setPendingChatRoomId', { chatRoomID, groupID: params.contractID })
    return chatRoomID
  },
  'gi.app/group/checkGroupSizeAndProposeMember': async function () {
    // if current size of the group is >= 150, display a warning prompt first before presenting the user with
    // 'AddMembers' proposal modal.

    const enforceDunbar = true // Context for this hard-coded boolean variable: https://github.com/okTurtles/group-income/pull/1648#discussion_r1230389924
    const { groupMembersCount, currentGroupState } = sbp('state/vuex/getters')
    const memberInvitesCount = Object.values(currentGroupState.invites || {}).filter((invite: any) => invite.creatorID !== INVITE_INITIAL_CREATOR).length
    const isGroupSizeLarge = (groupMembersCount + memberInvitesCount) >= MAX_GROUP_MEMBER_COUNT

    if (isGroupSizeLarge) {
      const translationArgs = {
        a_: `<a class='link' href='${ALLOWED_URLS.WIKIPEDIA_DUNBARS_NUMBER}' target='_blank'>`,
        _a: '</a>'
      }
      const promptConfig = enforceDunbar
        ? {
            heading: 'Large group size',
            question: L("Group sizes are limited to {a_}Dunbar's Number{_a} to prevent fraud.", translationArgs),
            primaryButton: L('OK')
          }
        : {
            heading: 'Large group size',
            question: L("Groups over 150 members are at significant risk for fraud, {a_}because it is difficult to verify everyone's identity.{_a} Are you sure that you want to add more members?", translationArgs),
            primaryButton: L('Yes'),
            secondaryButton: L('Cancel')
          }

      const primaryButtonSelected = await sbp('gi.ui/prompt', promptConfig)
      if (!enforceDunbar && primaryButtonSelected) {
        sbp('okTurtles.events/emit', REPLACE_MODAL, 'AddMembers')
      } else return false
    } else {
      sbp('okTurtles.events/emit', OPEN_MODAL, 'AddMembers')
    }
  }
}): string[])
