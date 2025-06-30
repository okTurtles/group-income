'use strict'

// NOTE: do not place contract-related events in here!
//       place those in @model/contracts/shared/constants.js instead
//
//       This file is primarily for frontend UI related events.

export const LOGIN = 'login'
export const LOGIN_ERROR = 'login-error'
export const LOGIN_COMPLETE = 'login-complete'
export const LOGGING_OUT = 'logging-out'
export const LOGOUT = 'logout'

export const ONLINE = 'online'
export const OFFLINE = 'offline'
export const RECONNECTING = 'reconnecting'
export const RECONNECTION_FAILED = 'reconnection-failed'

export const KV_EVENT = 'kv-event'
export const KV_LOAD_STATUS = 'kv-load-status'

export const ACCEPTED_GROUP = 'accepted-group'
export const SWITCH_GROUP = 'switch-group'
export const JOINED_GROUP = 'joined-group'
export const LEFT_GROUP = 'left-group'
export const ERROR_GROUP_GENERAL_CHATROOM_DOES_NOT_EXIST = 'error-group-non-existent-#general'

export const JOINED_CHATROOM = 'joined-chatroom'
export const LEFT_CHATROOM = 'left-chatroom'
export const DELETED_CHATROOM = 'deleted-chatroom'
export const DELETE_ATTACHMENT = 'delete-attachment'
export const DELETE_ATTACHMENT_FEEDBACK = 'delete-attachment-complete'
export const ERROR_JOINING_CHATROOM = 'error-joining-chatroom'

export const REPLACED_STATE = 'replaced-state'

export const OPEN_MODAL = 'open-modal'
export const CLOSE_MODAL = 'close-modal'
export const REPLACE_MODAL = 'replace-modal'
export const SET_MODAL_QUERIES = 'set-modal-queries'
export const MODAL_RESPONSE = 'modal-response'

export const OPEN_EMOTICON = 'open-emoticon'
export const CLOSE_EMOTICON = 'close-emoticon'
export const SELECT_EMOTICON = 'select-emoticon'

export const OPEN_TOUCH_LINK_HELPER = 'open-touch-link-helper'

export const CAPTURED_LOGS = 'captured-logs'
export const SET_APP_LOGS_FILTER = 'set-app-logs-filter'

export const INCOME_DETAILS_UPDATE = 'income-details-update'

export const PAYMENTS_RECORDED = 'payments-recorded'

export const AVATAR_EDITED = 'avatar-edited'

export const THEME_CHANGE = 'theme-change'

export const CHATROOM_EVENTS = 'chatroom-events'
export const CHATROOM_USER_TYPING = 'chatroom-user-typing'
export const CHATROOM_USER_STOP_TYPING = 'chatroom-user-stop-typing'

export const NAMESPACE_REGISTRATION = 'namespace-registration'

export const KV_QUEUE = 'kv-queue'

export const PWA_INSTALLABLE = 'pwa-installable'

export const CHELONIA_STATE_MODIFIED = 'chelonia-state-modified'

export const NOTIFICATION_EMITTED = 'notification-emitted'
export const NOTIFICATION_REMOVED = 'notification-removed'
export const NOTIFICATION_STATUS_LOADED = 'notification-status-loaded'

export const NEW_CHATROOM_UNREAD_POSITION = 'new-chatroom-unread-position'
export const NEW_LAST_LOGGED_IN = 'new-last-logged-in'
export const NEW_UNREAD_MESSAGES = 'new-unread-messages'
export const NEW_PREFERENCES = 'new-preferences'

export const NEW_CHATROOM_NOTIFICATION_SETTINGS = 'new-chatroom-notification-settings'

export const CONTRACT_SYNCS_RESET = 'new-current-syncs'

export const SERIOUS_ERROR = 'serious-error'
