'use strict'

export const INVITE_INITIAL_CREATOR = 'invite-initial-creator'
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

export const MESSAGE_ACTION_TYPES = {
  ADD_MESSAGE: 'message-action-add-message',
  EDIT_MESSAGE: 'message-action-edit-message',
  DELETE_MESSAGE: 'message-action-delete-message'
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
