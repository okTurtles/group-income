'use strict'

// any constants that are dedicated to the UI of the app should be kept in this file.
// (context: https://github.com/okTurtles/group-income/pull/1694#discussion_r1304706653)

export const CHAT_ATTACHMENT_SUPPORTED_EXTENSIONS = [
  // reference: https://developer.mozilla.org/en-US/docs/Web/HTTP/Basics_of_HTTP/MIME_types/Common_types
  'avif', 'bmp', 'gif', 'ico', 'jpeg', 'jpg', 'png', 'svg', 'tif', 'tiff', 'webp', // image
  'aac', 'cda', 'mid', 'midi', 'mp3', 'oga', 'opus', 'wav', 'weba', // audio
  'avi', 'mov', 'mp4', 'mpeg', 'ogv', 'ogx', 'ts', 'webm', '3gp', '3g2', // video
  'arc', 'bz', 'bz2', 'epub', 'gz', 'jar', 'rar', 'tar', 'zip', '7z', // archive
  'csh', 'css', 'csv', 'doc', 'docx', 'htm', 'html', 'ics', 'js', 'json', 'jsonld', 'md', 'mjs', 'vue', 'ts', 'scss',
  'odp', 'ods', 'odt', 'pdf', 'php', 'ppt', 'pptx', 'sh', 'txt', 'xhtml', 'xls', 'xlsx', 'xml', // common text/document
  'eot', 'otf', 'rtf', 'ttf', 'woff', 'woff2', // font
  'abw', 'azw', 'bin', 'csh', 'db', 'mpkg', 'vsd', 'xul' // miscellaneous
]

// NOTE: Below value was obtained from the '413 Payload Too Large' server error
//       meaning if this limit is updated on the server-side, an update is required here too.
// TODO: fetch this value from a server API
export const KILOBYTE = 1 << 10
export const MEGABYTE = 1 << 20
export const CHAT_ATTACHMENT_SIZE_LIMIT = 30 * MEGABYTE // in byte.
export const IMAGE_ATTACHMENT_MAX_SIZE = 400 * KILOBYTE // 400KB
export const CHAT_LONG_MESSAGE_HEIGHT_THRESHOLD_DESKTOP = 500 * 1.25 // in px
export const CHAT_LONG_MESSAGE_HEIGHT_THRESHOLD_MOBILE = 500 * 1.5 // The value of mobile is more tolerant considering smaller screen size.

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
  NOTIFICATIONS: 'notifications' // identity contract
}

export const KV_LOAD_STATUS = {
  NON_INIT: 'non-init',
  LOADING: 'loading',
  LOADED: 'loaded'
}

export const MAX_LOG_ENTRIES = 2000
// The throttle window for updating lastLoggedIn
export const LAST_LOGGED_IN_THROTTLE_WINDOW = 30 * 60E3 // 30 minutes

export const DEVICE_SETTINGS = {
  DISABLE_NOTIFICATIONS: 'disableNotifications'
}
