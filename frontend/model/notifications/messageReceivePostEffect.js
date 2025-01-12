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
  const rootGetters = await sbp('state/vuex/getters')
  const rootState = await sbp('state/vuex/state')
  const identityContractID = rootState.loggedIn?.identityContractID
  if (!identityContractID) return
  const isDM = rootState[identityContractID].chatRooms[contractID]
  const shouldAddToUnreadMessages = isDMOrMention || [MESSAGE_TYPES.INTERACTIVE, MESSAGE_TYPES.POLL].includes(messageType)

  await sbp('chelonia/contract/retain', contractID, { ephemeral: true })
  try {
    if (shouldAddToUnreadMessages) {
      sbp('gi.actions/identity/kv/addChatRoomUnreadMessage', { contractID, messageHash, createdHeight: height })
    }

    /*
    // TODO: This needs to be done differently in the SW
    const currentRoute = sbp('controller/router').history.current || ''
    const isTargetChatroomCurrentlyActive = currentRoute.path.includes('/group-chat') &&
  rootGetters.currentChatRoomId === contractID // when the target chatroom is currently open/active on the browser, No need to send a notification.
    if (isTargetChatroomCurrentlyActive) return // Skip notifications
    // END TODO: This needs to be done differently in the SW
    */

    let title = `# ${chatRoomName}`
    let icon
    if (isDM) {
    // NOTE: partner identity contract could not be synced yet
      const members = Object.keys(rootState[contractID].members)
      const isDMToMyself = members.length === 1 && members[0] === identityContractID
      const partners = members
        .filter(memberID => memberID !== identityContractID)
        .sort((p1, p2) => {
          const p1JoinedDate = new Date(identityContractID.members[p1].joinedDate).getTime()
          const p2JoinedDate = new Date(identityContractID.members[p2].joinedDate).getTime()
          return p1JoinedDate - p2JoinedDate
        })
      const lastJoinedPartner = isDMToMyself ? identityContractID : partners[partners.length - 1]

      title = isDMToMyself
        ? rootGetters.userDisplayNameFromID(identityContractID)
        : partners.map(cID => rootGetters.userDisplayNameFromID(cID)).join(', ')
      icon = rootGetters.ourContactProfilesById[lastJoinedPartner]?.picture
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
    // `MESSAGE_RECEIVE` should be forwarded to the tab
    shouldSoundMessage && sbp('okTurtles.events/emit', MESSAGE_RECEIVE)
  } finally {
    await sbp('chelonia/contract/release', contractID, { ephemeral: true })
  }
}

export default messageReceivePostEffect
