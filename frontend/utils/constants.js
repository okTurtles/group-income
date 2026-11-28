'use strict'

// any constants that are dedicated to the UI of the app should be kept in this file.
// (context: https://github.com/okTurtles/group-income/pull/1694#discussion_r1304706653)

// NOTE: Below value was obtained from the '413 Payload Too Large' server error
//       meaning if this limit is updated on the server-side, an update is required here too.
// TODO: fetch this value from a server API
export const KILOBYTE = 1 << 10
export const MEGABYTE = 1 << 20
export const CHAT_ATTACHMENT_SIZE_LIMIT = 30 * MEGABYTE // in byte.
export const IMAGE_ATTACHMENT_MAX_SIZE = 400 * KILOBYTE // 400KB
export const CHAT_LONG_MESSAGE_HEIGHT_THRESHOLD_DESKTOP = 500 * 1.25 // in px
export const CHAT_LONG_MESSAGE_HEIGHT_THRESHOLD_MOBILE = 500 * 1.5 // The value of mobile is more tolerant considering smaller screen size.
export const EMOJI_REGEX: any = /(\p{Emoji_Presentation}|\p{Emoji}\uFE0F|[\u2615-\u27BF]|\u200D)/gu
export const VOICE_RECORDING_MIME_TYPES = {
  DEFAULT: 'audio/mp4',
  // Firefox's MediaRecorder cannot produce mp4 and defaults to ogg natively
  // (MediaRecorder.isTypeSupported('audio/mp4') returns false there).
  // Why not use audio/ogg for recording mime type in all other browsers then:
  // - In Chromium-based browsers, audio recorded as audio/ogg produces files whose duration cannot be detected properly.
  FIREFOX: 'audio/ogg'
}

// GLOBAL_DASHBOARD_KEY is primarily used as the key for the global dashboard
// in `currentChatRoomIDs`, which maps each user group to its active chatroom ID.
// Since the global dashboard is not tied to any specific group (and therefore has no groupID),
// we use a special key, 'global', to represent this context.
// This key may also be reused in other parts of the application for similar purposes.
export const GLOBAL_DASHBOARD_KEY = 'global'

export const TextObjectType = {
  Text: 'TEXT',
  InAppLink: 'IN_APP_LINK',
  MemberMention: 'MEMBER_MENTION',
  ChannelMention: 'CHANNEL_MENTION'
}

export const KV_KEYS = {
  UNREAD_MESSAGES: 'unreadMessages', // identity contract
  LAST_LOGGED_IN: 'lastLoggedIn', // group contract
  PREFERENCES: 'preferences', // identity contract
  NOTIFICATIONS: 'notifications', // identity contract
  NS_CACHE: 'namespace-cache' // identity contract
}

export const KV_LOAD_STATUS = {
  NON_INIT: 'non-init',
  LOADING: 'loading',
  LOADED: 'loaded',
  ERROR: 'error'
}

// toast-related constants
export const MAX_TOAST_COUNT = 4
export const TOAST_POSITIONS = {
  TOP_RIGHT: 'top-right',
  TOP_LEFT: 'top-left',
  TOP_CENTER: 'top-center',
  BOTTOM_RIGHT: 'bottom-right',
  BOTTOM_LEFT: 'bottom-left',
  BOTTOM_CENTER: 'bottom-center'
}
export const TOAST_VARIANTS = {
  DEFAULT: 'default',
  SUCCESS: 'success',
  WARNING: 'warning',
  ERROR: 'error'
}

export const MAX_LOG_ENTRIES = 2000
// The throttle window for updating lastLoggedIn
export const LAST_LOGGED_IN_THROTTLE_WINDOW = 30 * 60E3 // 30 minutes

export const DEVICE_SETTINGS = {
  DISABLE_NOTIFICATIONS: 'disableNotifications',
  JOURNAL_REDACTIONS_APPLIED_VERSION: 'journalRedactionsAppliedVersion'
}

// `Error.name` of push-subscription requests that failed only because the
// service worker isn't connected to the server. It survives the SW <-> tab
// RPC, so that tabs can tell these apart from Web Push failures.
export const PUBSUB_NOT_OPEN_ERROR = 'GIErrorPubsubNotOpen'

// The service worker's connection status (see
// `controller/serviceworkers/connectionMonitor.js`), queried by tabs
export const CONNECTION_STATUS_SELECTOR = 'sw/connection/status'

// Restarts the service worker's reconnection cycle (see
// `controller/serviceworkers/reconnectionPolicy.js`). Tabs call it when they
// become visible and from the connection banner's "Retry now" button.
export const CONNECTION_RESTART_SELECTOR = 'sw/connection/restart'

// The longest delay between two attempts to reconnect the pubsub client,
// which keeps retrying while a page is open (the library's default is 60 s).
// A page opened or shown meanwhile restarts the cycle with short delays, so
// this can be long without delaying a reconnection that someone waits for.
export const PUBSUB_MAX_RECONNECTION_DELAY = 10 * 60 * 1000
