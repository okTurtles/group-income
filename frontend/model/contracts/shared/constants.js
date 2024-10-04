'use strict'

export const MAX_HASH_LEN = 300
export const MAX_MEMO_LEN = 4096
export const MAX_URL_LEN = 2048

// identity.js related

export const IDENTITY_PASSWORD_MIN_CHARS = 7
export const IDENTITY_USERNAME_MAX_CHARS = 80
export const IDENTITY_EMAIL_MAX_CHARS = 320
export const IDENTITY_BIO_MAX_CHARS = 500

// group.js related

export const INVITE_INITIAL_CREATOR = 'invite-initial-creator'
export const PROFILE_STATUS = {
  ACTIVE: 'active', // confirmed group join
  PENDING: 'pending', // shortly after being approved to join the group
  REMOVED: 'removed'
}
export const GROUP_NAME_MAX_CHAR = 50 // https://github.com/okTurtles/group-income/issues/2196
export const GROUP_DESCRIPTION_MAX_CHAR = 500
export const GROUP_PAYMENT_METHOD_MAX_CHAR = 250
export const GROUP_NON_MONETARY_CONTRIBUTION_MAX_CHAR = 150
export const GROUP_CURRENCY_MAX_CHAR = 10
export const GROUP_MAX_PLEDGE_AMOUNT = 1000000000
export const GROUP_MINCOME_MAX = 1000000000
export const GROUP_DISTRIBUTION_PERIOD_MAX_DAYS = 365

// group-proposal related

export const PROPOSAL_RESULT = 'proposal-result'
export const PROPOSAL_INVITE_MEMBER = 'invite-member'
export const PROPOSAL_REMOVE_MEMBER = 'remove-member'
export const PROPOSAL_GROUP_SETTING_CHANGE = 'group-setting-change'
export const PROPOSAL_PROPOSAL_SETTING_CHANGE = 'proposal-setting-change'
export const PROPOSAL_GENERIC = 'generic'

export const PROPOSAL_ARCHIVED = 'proposal-archived'
export const MAX_ARCHIVED_PROPOSALS = 100
export const PAYMENTS_ARCHIVED = 'payments-archived'
export const MAX_ARCHIVED_PERIODS = 100
export const MAX_SAVED_PERIODS = 2
export const MAX_HISTORY_PERIODS = 6
export const MAX_GROUP_MEMBER_COUNT = 150 // Dunbar's number (https://en.wikipedia.org/wiki/Dunbar's_number)

export const STATUS_OPEN = 'open'
export const STATUS_PASSED = 'passed'
export const STATUS_FAILED = 'failed'
export const STATUS_EXPIRING = 'expiring' // Only useful to notify users that the proposals are expiring
export const STATUS_EXPIRED = 'expired'
export const STATUS_CANCELLED = 'cancelled'

export const STREAK_ON_TIME_PAYMENTS = 1
export const STREAK_MISSED_PAYMENTS = 2
export const STREAK_MISSED_PROPSAL_VOTE = 2
export const STREAK_NOT_LOGGED_IN_DAYS = 14

// chatroom.js related

export const CHATROOM_GENERAL_NAME = 'general' // Chatroom name must be lowercase-only.
export const CHATROOM_NAME_LIMITS_IN_CHARS = 50
export const CHATROOM_DESCRIPTION_LIMITS_IN_CHARS = 280
export const CHATROOM_MAX_MESSAGE_LEN = 20000
export const CHATROOM_MAX_MESSAGES = 20
export const CHATROOM_ACTIONS_PER_PAGE = 40

export const CHATROOM_MEMBER_MENTION_SPECIAL_CHAR = '@'
export const CHATROOM_CHANNEL_MENTION_SPECIAL_CHAR = '#'

// chatroom events
export const MESSAGE_RECEIVE_RAW = 'message-receive-raw'
export const MESSAGE_RECEIVE = 'message-receive'
export const MESSAGE_SEND = 'message-send'

export const CHATROOM_TYPES = {
  DIRECT_MESSAGE: 'direct-message',
  GROUP: 'group'
}

export const CHATROOM_PRIVACY_LEVEL = {
  GROUP: 'group',
  PRIVATE: 'private',
  PUBLIC: 'public'
}

export const MESSAGE_TYPES = {
  POLL: 'poll',
  TEXT: 'text',
  INTERACTIVE: 'interactive',
  NOTIFICATION: 'notification'
}

export const INVITE_EXPIRES_IN_DAYS = {
  ON_BOARDING: 30,
  PROPOSAL: 7
}

export const MESSAGE_NOTIFICATIONS = {
  ADD_MEMBER: 'add-member',
  JOIN_MEMBER: 'join-member',
  LEAVE_MEMBER: 'leave-member',
  KICK_MEMBER: 'kick-member',
  UPDATE_DESCRIPTION: 'update-description',
  UPDATE_NAME: 'update-name'
}

export const MESSAGE_VARIANTS = {
  PENDING: 'pending',
  SENT: 'sent',
  RECEIVED: 'received',
  FAILED: 'failed'
}

export const MESSAGE_NOTIFY_SETTINGS = {
  ALL_MESSAGES: 'all-messages',
  DIRECT_MESSAGES: 'direct-messages',
  NOTHING: 'nothing'
}

export const POLL_TYPES = {
  SINGLE_CHOICE: 'single-vote', // allows only 1 choice per member
  MULTIPLE_CHOICES: 'multiple-votes' // allows multiple choices on the poll
}

export const POLL_STATUS = {
  ACTIVE: 'active',
  CLOSED: 'closed'
}

export const POLL_MAX_OPTIONS = 20
