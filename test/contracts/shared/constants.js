"use strict";

// frontend/model/contracts/shared/constants.js
var IDENTITY_PASSWORD_MIN_CHARS = 7;
var IDENTITY_USERNAME_MAX_CHARS = 80;
var INVITE_INITIAL_CREATOR = "invite-initial-creator";
var INVITE_STATUS = {
  REVOKED: "revoked",
  VALID: "valid",
  USED: "used"
};
var PROFILE_STATUS = {
  ACTIVE: "active",
  PENDING: "pending",
  REMOVED: "removed"
};
var PROPOSAL_RESULT = "proposal-result";
var PROPOSAL_INVITE_MEMBER = "invite-member";
var PROPOSAL_REMOVE_MEMBER = "remove-member";
var PROPOSAL_GROUP_SETTING_CHANGE = "group-setting-change";
var PROPOSAL_PROPOSAL_SETTING_CHANGE = "proposal-setting-change";
var PROPOSAL_GENERIC = "generic";
var PROPOSAL_ARCHIVED = "proposal-archived";
var MAX_ARCHIVED_PROPOSALS = 100;
var STATUS_OPEN = "open";
var STATUS_PASSED = "passed";
var STATUS_FAILED = "failed";
var STATUS_EXPIRED = "expired";
var STATUS_CANCELLED = "cancelled";
var CHATROOM_GENERAL_NAME = "General";
var CHATROOM_NAME_LIMITS_IN_CHARS = 50;
var CHATROOM_DESCRIPTION_LIMITS_IN_CHARS = 280;
var CHATROOM_ACTIONS_PER_PAGE = 40;
var CHATROOM_MESSAGES_PER_PAGE = 20;
var CHATROOM_MESSAGE_ACTION = "chatroom-message-action";
var CHATROOM_DETAILS_UPDATED = "chatroom-details-updated";
var MESSAGE_RECEIVE = "message-receive";
var MESSAGE_SEND = "message-send";
var CHATROOM_TYPES = {
  INDIVIDUAL: "individual",
  GROUP: "group"
};
var CHATROOM_PRIVACY_LEVEL = {
  GROUP: "chatroom-privacy-level-group",
  PRIVATE: "chatroom-privacy-level-private",
  PUBLIC: "chatroom-privacy-level-public"
};
var MESSAGE_TYPES = {
  POLL: "message-poll",
  TEXT: "message-text",
  INTERACTIVE: "message-interactive",
  NOTIFICATION: "message-notification"
};
var INVITE_EXPIRES_IN_DAYS = {
  ON_BOARDING: 30,
  PROPOSAL: 7
};
var MESSAGE_NOTIFICATIONS = {
  ADD_MEMBER: "add-member",
  JOIN_MEMBER: "join-member",
  LEAVE_MEMBER: "leave-member",
  KICK_MEMBER: "kick-member",
  UPDATE_DESCRIPTION: "update-description",
  UPDATE_NAME: "update-name",
  DELETE_CHANNEL: "delete-channel",
  VOTE: "vote"
};
var MESSAGE_VARIANTS = {
  PENDING: "pending",
  SENT: "sent",
  RECEIVED: "received",
  FAILED: "failed"
};
var PROPOSAL_VARIANTS = {
  CREATED: "proposal-created",
  EXPIRING: "proposal-expiring",
  ACCEPTED: "proposal-accepted",
  REJECTED: "proposal-rejected",
  EXPIRED: "proposal-expired"
};
var MAIL_TYPE_MESSAGE = "message";
var MAIL_TYPE_FRIEND_REQ = "friend-request";
export {
  CHATROOM_ACTIONS_PER_PAGE,
  CHATROOM_DESCRIPTION_LIMITS_IN_CHARS,
  CHATROOM_DETAILS_UPDATED,
  CHATROOM_GENERAL_NAME,
  CHATROOM_MESSAGES_PER_PAGE,
  CHATROOM_MESSAGE_ACTION,
  CHATROOM_NAME_LIMITS_IN_CHARS,
  CHATROOM_PRIVACY_LEVEL,
  CHATROOM_TYPES,
  IDENTITY_PASSWORD_MIN_CHARS,
  IDENTITY_USERNAME_MAX_CHARS,
  INVITE_EXPIRES_IN_DAYS,
  INVITE_INITIAL_CREATOR,
  INVITE_STATUS,
  MAIL_TYPE_FRIEND_REQ,
  MAIL_TYPE_MESSAGE,
  MAX_ARCHIVED_PROPOSALS,
  MESSAGE_NOTIFICATIONS,
  MESSAGE_RECEIVE,
  MESSAGE_SEND,
  MESSAGE_TYPES,
  MESSAGE_VARIANTS,
  PROFILE_STATUS,
  PROPOSAL_ARCHIVED,
  PROPOSAL_GENERIC,
  PROPOSAL_GROUP_SETTING_CHANGE,
  PROPOSAL_INVITE_MEMBER,
  PROPOSAL_PROPOSAL_SETTING_CHANGE,
  PROPOSAL_REMOVE_MEMBER,
  PROPOSAL_RESULT,
  PROPOSAL_VARIANTS,
  STATUS_CANCELLED,
  STATUS_EXPIRED,
  STATUS_FAILED,
  STATUS_OPEN,
  STATUS_PASSED
};
//# sourceMappingURL=constants.js.map
