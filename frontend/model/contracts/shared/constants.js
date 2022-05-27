'use strict'

// group.js related

export const INVITE_INITIAL_CREATOR = 'invite-initial-creator'
export const INVITE_STATUS = {
  REVOKED: 'revoked',
  VALID: 'valid',
  USED: 'used'
}
export const PROFILE_STATUS = {
  ACTIVE: 'active', // confirmed group join
  PENDING: 'pending', // shortly after being approved to join the group
  REMOVED: 'removed'
}

// chatroom.js related

export const CHATROOM_GENERAL_NAME = 'General'
export const CHATROOM_NAME_LIMITS_IN_CHARS = 50
export const CHATROOM_DESCRIPTION_LIMITS_IN_CHARS = 280
export const CHATROOM_ACTIONS_PER_PAGE = 40
export const CHATROOM_MESSAGES_PER_PAGE = 20

export const CHATROOM_TYPES = {
  INDIVIDUAL: 'individual',
  GROUP: 'group'
}

export const CHATROOM_PRIVACY_LEVEL = {
  GROUP: 'chatroom-privacy-level-group',
  PRIVATE: 'chatroom-privacy-level-private',
  PUBLIC: 'chatroom-privacy-level-public'
}

export const MESSAGE_TYPES = {
  POLL: 'message-poll',
  TEXT: 'message-text',
  INTERACTIVE: 'message-interactive',
  NOTIFICATION: 'message-notification'
}

export const INVITE_EXPIRES_IN_DAYS = {
  INITIAL: 30,
  PROPOSAL: 7
}

export const MESSAGE_NOTIFICATIONS = {
  ADD_MEMBER: 'add-member',
  JOIN_MEMBER: 'join-member',
  LEAVE_MEMBER: 'leave-member',
  KICK_MEMBER: 'kick-member',
  UPDATE_DESCRIPTION: 'update-description',
  UPDATE_NAME: 'update-name',
  DELETE_CHANNEL: 'delete-channel',
  VOTE: 'vote'
}

export const MESSAGE_VARIANTS = {
  PENDING: 'pending',
  SENT: 'sent',
  RECEIVED: 'received',
  FAILED: 'failed'
}

// mailbox.js related

export const MAIL_TYPE_MESSAGE = 'message'
export const MAIL_TYPE_FRIEND_REQ = 'friend-request'
