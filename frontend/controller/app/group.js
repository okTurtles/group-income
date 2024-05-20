'use strict'

import sbp from '@sbp/sbp'
import { SWITCH_GROUP } from '@utils/events.js'
import type { ChelKeyRequestParams } from '~/shared/domains/chelonia/chelonia.js'
import type { GIActionParams } from './types.js'

export default (sbp('sbp/selectors/register', {
  'gi.app/group/createAndSwitch': async function (params: GIActionParams) {
    const contractID = await sbp('gi.actions/group/create', params)
    sbp('gi.app/group/switch', contractID)
    return contractID
  },
  'gi.app/group/switch': function (groupId) {
    sbp('state/vuex/commit', 'setCurrentGroupId', groupId)
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
  }
}))
