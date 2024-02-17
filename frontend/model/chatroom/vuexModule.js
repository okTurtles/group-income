'use strict'

import { cloneDeep } from '@model/contracts/shared/giLodash.js'

const defaultState = {
  currentChatRoomIDs: {}, // { [groupId]: currentChatRoomId }
  chatRoomScrollPosition: {}, // [chatRoomId]: messageHash
  chatRoomUnread: {}, // [chatRoomId]: { readUntil: { messageHash, createdDate }, messages: [{ messageHash, createdDate, type, deletedDate? }]}
  chatNotificationSettings: {} // { messageNotification: MESSAGE_NOTIFY_SETTINGS, messageSound: MESSAGE_NOTIFY_SETTINGS }
}

// getters
const getters = {}

export default ({
  state: () => cloneDeep(defaultState),
  getters
}: Object)
