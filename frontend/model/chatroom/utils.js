'use strict'
import sbp from '@sbp/sbp'
import { makeMentionFromUserID } from '@model/contracts/shared/functions.js'
import {
  CHATROOM_CHANNEL_MENTION_SPECIAL_CHAR,
  CHATROOM_MEMBER_MENTION_SPECIAL_CHAR
} from '@model/contracts/shared/constants.js'

export function makeChannelMention (str: string, withId: boolean = false): string {
  return `${CHATROOM_CHANNEL_MENTION_SPECIAL_CHAR}${withId ? ':chatID:' : ''}${str}`
}

export function getIdFromChannelMention (str: string): string {
  console.log('!@# str', str)
  return str.includes(':chatID:')
    ? str.split(':chatID:')[1]
    : ''
}

export function swapMentionIDForDisplayname (
  text: string,
  options: Object = {
    escaped: true, // this indicates that the text contains escaped characters
    forChat: true // this indicates that the function is being used for messages inside chatroom
  }
): string {
  const {
    getChatroomNameById,
    usernameFromID,
    userDisplayNameFromID
  } = sbp('state/vuex/getters')
  const { reverseNamespaceLookups } = sbp('state/vuex/state')
  const possibleMentions = [
    ...Object.keys(reverseNamespaceLookups).map(u => makeMentionFromUserID(u).me).filter(v => !!v),
    makeChannelMention('[a-zA-Z0-9]+', true) // chat-mention as contractID has a format of `#:chatID:...`. So target them as a pattern instead of the exact strings.
  ]
  const { escaped, forChat } = options
  const regEx = escaped
    ? new RegExp(`(?<=\\s|^)(${possibleMentions.join('|')})(?=[^\\w\\d]|$)`)
    : new RegExp(`(${possibleMentions.join('|')})`)

  const swap = (t) => {
    if (t.startsWith(CHATROOM_MEMBER_MENTION_SPECIAL_CHAR)) {
      // swap member mention
      const userID = t.slice(1)
      const prefix = forChat ? CHATROOM_MEMBER_MENTION_SPECIAL_CHAR : ''
      const body = forChat ? usernameFromID(userID) : userDisplayNameFromID(userID)
      return prefix + body
    } else if (t.startsWith(CHATROOM_CHANNEL_MENTION_SPECIAL_CHAR)) {
      // swap channel mention
      const channelID = getIdFromChannelMention(t)
      const prefix = forChat ? CHATROOM_CHANNEL_MENTION_SPECIAL_CHAR : ''
      return prefix + getChatroomNameById(channelID)
    }
    return t
  }

  return text
    .split(regEx)
    .map(t => regEx.test(t) ? swap(t) : t)
    .join('')
}

// This function serves two purposes, depending on the forceUsername parameter
// If forceUsername is true, mentions will be like @username, @all, for display
// purposes.
// If forceUsername is false (default), mentions like @username will be converted
// to @<userID>, for internal representation purposes.
// forceUsername is used for display purposes in the UI, so that we can show
// a mention like @username instead of @userID in SendArea
export function makeMentionFromUsername (username: string, forceUsername: ?boolean): {
    me: string, all: string
  } {
  const rootGetters = sbp('state/vuex/getters')
  // Even if forceUsername is true, we want to look up the contract ID to ensure
  // that it exists, so that we know it'll later succeed.
  const userID = rootGetters.ourContactProfilesByUsername[username]?.contractID
  return makeMentionFromUserID(forceUsername && userID ? username : userID)
}

export { makeMentionFromUserID }
