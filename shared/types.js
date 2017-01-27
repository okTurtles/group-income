/* eslint no-undef: "off", no-unused-vars: "off" */

// Run flow with: yarn run flow

// https://flowtype.org/docs/advanced-configuration.html
// https://flowtype.org/docs/declarations.html
// https://flowtype.org/docs/modules.html#import-type
// From: https://flowtype.org/docs/builtins.html#mixed
export type JSONType = string | number | boolean | null | JSONObject | JSONArray;
export type JSONObject = { [key:string]: JSONType };
export type JSONArray = Array<JSONType>;

export type Entry = {
  data: JSONObject;
  parentHash: ?string;
  version: ?string;
}
// TODO: Remove when possible
export type UserSession = {
  version: string;
  currentGroup: Log;
  availableGroups : [string];
  offset : [string];
}
export type Group = {
  version: string;
  creationDate: date;
  groupName: string;
  sharedValues: string;
  changePercentage: number;
  openMembership: boolean;
  memberApprovalPercentage: number;
  memberRemovalPercentage: number;
  incomeProvided: number;
  contributionPrivacy: string;
  founderHashKey: string;
  data: JSONObject;
}
// TODO: Remove when possible
export type Log= {
  groupId: string;
  currentLogPosition: string;
}
import type {EvType, EvTypeErr, EvTypeOK} from './constants'
export type {EvType, EvTypeErr, EvTypeOK}

export type Response =
  // | {event: EvTypeErr; err: string; data?: JSONType}
  // https://github.com/facebook/flow/issues/3041
  | {event: EvTypeErr; err: JSONType; data?: JSONType}
  | {event: EvTypeOK; data: JSONType}

import type {EventType, EventTypePayment, EventTypeCreation, EventTypeVoting, Event} from './events'
export type {EventType, EventTypePayment, EventTypeCreation, EventTypeVoting, Event}
