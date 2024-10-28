'use strict'

import { L } from '@common/common.js'
import sbp from '@sbp/sbp'
import {
  MESSAGE_NOTIFY_SETTINGS,
  MESSAGE_RECEIVE,
  MESSAGE_TYPES
} from '@model/contracts/shared/constants.js'
import {
  swapMentionIDForDisplayname
} from '@model/chatroom/utils.js'
import { makeNotification } from './nativeNotification.js'

async function messageReceivePostEffect ({
  contractID, messageHash, height, text,
  isDMOrMention, messageType, memberID, chatRoomName
}: {
    contractID: string,
    messageHash: string,
    height: number,
    text: string,
    messageType: string,
    isDMOrMention: boolean,
    memberID: string,
    chatRoomName: string
  }): Promise<void> {
  // TODO: This can't be a root getter when running in a SW
  const rootGetters = await sbp('state/vuex/getters')
  const isGroupDM = rootGetters.isGroupDirectMessage(contractID)
  const shouldAddToUnreadMessages = isDMOrMention || [MESSAGE_TYPES.INTERACTIVE, MESSAGE_TYPES.POLL].includes(messageType)

  await sbp('chelonia/contract/wait', contractID)
  if (shouldAddToUnreadMessages) {
    sbp('gi.actions/identity/kv/addChatRoomUnreadMessage', { contractID, messageHash, createdHeight: height })
  }

  // TODO: This needs to be done differently in the SW
  const currentRoute = sbp('controller/router').history.current || ''
  const isTargetChatroomCurrentlyActive = currentRoute.path.includes('/group-chat') &&
  rootGetters.currentChatRoomId === contractID // when the target chatroom is currently open/active on the browser, No need to send a notification.
  if (isTargetChatroomCurrentlyActive) return // Skip notifications
  // END TODO: This needs to be done differently in the SW

  let title = `# ${chatRoomName}`
  let icon
  if (isGroupDM) {
    // NOTE: partner identity contract could not be synced yet
    title = rootGetters.ourGroupDirectMessages[contractID].title
    icon = rootGetters.ourGroupDirectMessages[contractID].picture
  }
  const path = `/group-chat/${contractID}`

  const chatNotificationSettings = rootGetters.chatNotificationSettings[contractID] || rootGetters.chatNotificationSettings.default
  const { messageNotification, messageSound } = chatNotificationSettings
  const shouldNotifyMessage = messageNotification === MESSAGE_NOTIFY_SETTINGS.ALL_MESSAGES ||
      (messageNotification === MESSAGE_NOTIFY_SETTINGS.DIRECT_MESSAGES && isDMOrMention)
  const shouldSoundMessage = messageSound === MESSAGE_NOTIFY_SETTINGS.ALL_MESSAGES ||
      (messageSound === MESSAGE_NOTIFY_SETTINGS.DIRECT_MESSAGES && isDMOrMention)

  shouldNotifyMessage && makeNotification({
    title,
    body: messageType === MESSAGE_TYPES.TEXT ? swapMentionIDForDisplayname(text) : L('New message'),
    icon,
    path
  })
  shouldSoundMessage && sbp('okTurtles.events/emit', MESSAGE_RECEIVE)
}

export default messageReceivePostEffect
