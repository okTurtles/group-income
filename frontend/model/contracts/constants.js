'use strict'

export const INVITE_INITIAL_CREATOR = 'INVITE_INITIAL_CREATOR'
export const INVITE_STATUS = {
  REVOKED: 'revoked',
  VALID: 'valid',
  USED: 'used'
}
export const PROFILE_STATUS = {
  ACTIVE: 'active',
  REMOVED: 'removed'
}

export const CHATROOM_GENERAL_NAME = 'General'
export const CHATROOM_NAME_LIMITS_IN_CHARS = 50
export const CHATROOM_DESCRIPTION_LIMITS_IN_CHARS = 280

export const chatRoomTypes = {
  INDIVIDUAL: 'INDIVIDUAL',
  GROUP: 'GROUP'
}

export const messageTypes = {
  POLL: 'MESSAGE-POLL',
  TEXT: 'MESSAGE-TEXT',
  INTERACTIVE: 'MESSAGE-INTERACTIVE',
  NOTIFICATION: 'MESSAGE-NOTIFICATION'
}

export const INVITE_EXPIRES_IN_DAYS = {
  INITIAL: 30,
  PROPOSAL: 7
}
