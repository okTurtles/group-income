'use strict'

import { L } from '@common/common.js'
import {
  INVITE_INITIAL_CREATOR,
  MAX_GROUP_MEMBER_COUNT
} from '@model/contracts/shared/constants.js'
import sbp from '@sbp/sbp'
import { OPEN_MODAL, REPLACE_MODAL, SWITCH_GROUP } from '@utils/events.js'
import ALLOWED_URLS from '@view-utils/allowedUrls.js'
import type { ChelKeyRequestParams } from '~/shared/domains/chelonia/chelonia.js'
import type { GIActionParams } from './types.js'

export default (sbp('sbp/selectors/register', {
  'gi.app/group/createAndSwitch': async function (params: GIActionParams) {
    const contractID = await sbp('gi.actions/group/create', params)
    sbp('gi.app/group/switch', contractID)
    return contractID
  },
  'gi.app/group/switch': function (groupId) {
    sbp('okTurtles.events/emit', SWITCH_GROUP, { contractID: groupId })
  },
  'gi.app/group/joinAndSwitch': async function (params: $Exact<ChelKeyRequestParams>) {
    await sbp('gi.actions/group/join', params)
    // after joining, we can set the current group
    return sbp('gi.app/group/switch', params.contractID)
  },
  'gi.app/group/joinWithInviteSecret': async function (groupId: string, secret: string) {
    const result = await sbp('gi.actions/group/joinWithInviteSecret', groupId, secret)
    sbp('gi.app/group/switch', groupId)
    return result
  },
  'gi.app/group/addAndJoinChatRoom': async function (params: GIActionParams) {
    const chatRoomID = await sbp('gi.actions/group/addAndJoinChatRoom', params)
    await sbp('chelonia/contract/wait', chatRoomID)
    // joinChatRoom sideEffect will trigger a call to 'gi.actions/chatroom/join', we want
    // to wait for that action to be received and processed, and then switch the UI to the
    // new chatroom. We do this here instead of in the sideEffect for chatroom/join to
    // avoid causing the UI to change in other open tabs/windows, as per bug:
    // https://github.com/okTurtles/group-income/issues/1960
    if (sbp('state/vuex/getters').isJoinedChatRoom(chatRoomID)) {
      sbp('state/vuex/commit', 'setCurrentChatRoomId', { chatRoomID, groupID: params.contractID })
    }

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
}))
