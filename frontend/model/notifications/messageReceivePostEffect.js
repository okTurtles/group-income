'use strict'

import { L } from '@common/common.js'
import sbp from '@sbp/sbp'
import {
  CHATROOM_PRIVACY_LEVEL,
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
      sbp('gi.actions/identity/kv/addChatRoomUnreadMessage', { contractID, messageHash, createdHeight: height }).catch(e => {
        console.error('[messageReceivePostEffect] Error calling addChatRoomUnreadMessage', e)
      })
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
      const members = rootState[contractID].members
      const membersList = Object.keys(members)
      const isDMToMyself = membersList.length === 1 && membersList[0] === identityContractID
      const partnersList = membersList
        .filter(memberID => memberID !== identityContractID)
        .sort((p1, p2) => {
          const p1JoinedDate = new Date(members[p1].joinedDate).getTime()
          const p2JoinedDate = new Date(members[p2].joinedDate).getTime()
          return p1JoinedDate - p2JoinedDate
        })
      const lastJoinedPartner = isDMToMyself ? identityContractID : partnersList[partnersList.length - 1]

      title = isDMToMyself
        ? rootGetters.userDisplayNameFromID(identityContractID)
        : partnersList.map(cID => rootGetters.userDisplayNameFromID(cID)).join(', ')
      icon = rootGetters.ourContactProfilesById[lastJoinedPartner]?.picture
    } else {
      icon = rootGetters.ourContactProfilesById[memberID]?.picture
    }
    const path = `/group-chat/${contractID}`

    const privacyLevelPrivate = rootState[contractID]?.attributes?.privacyLevel === CHATROOM_PRIVACY_LEVEL.PRIVATE
    const chatNotificationSettings = rootGetters.chatNotificationSettings[contractID] || (privacyLevelPrivate
      ? rootGetters.chatNotificationSettings.privateDefault
      : rootGetters.chatNotificationSettings.publicDefault
    )
    const { messageNotification, messageSound } = chatNotificationSettings

    // If the contract is syncing (meaning we're loading the app, joining a
    // chatroom, etc.), don't use a native notification or sound. Do this only
    // for messages coming over the WS.
    // This may not be 100% reliable, but `firstSync` should make it work in
    // most cases.
    const isSyncing = sbp('chelonia/contract/isSyncing', contractID, { firstSync: true })
    // TODO: This could be an issue (false positive for emitting a native
    // notification) when the initial sync gets interrupted (e.g., network issues)
    // and then resumed.
    // In this case, we may get sound notifications for old events that we
    // should not, because technically it's not the first sync.
    if (isSyncing) return

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
    shouldSoundMessage && sbp('okTurtles.events/emit', MESSAGE_RECEIVE, {
      contractID,
      messageHash,
      messageType
    })
  } finally {
    await sbp('chelonia/contract/release', contractID, { ephemeral: true })
  }
}

export default messageReceivePostEffect
