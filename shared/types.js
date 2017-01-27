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

// https://github.com/facebook/flow/issues/3041
export type Response = {
  event: EvType;
  err?: string;
  data?: JSONType
}

import type {
  EvType, EvTypeErr, EvTypeOK,
  EntryType, EntryPayment, EntryCreation, EntryVoting
} from './constants'
export type {
  EvType, EvTypeErr, EvTypeOK,
  EntryType, EntryPayment, EntryCreation, EntryVoting
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
export type UserSession = {
  version: string;
  currentGroup: Log;
  availableGroups : [string];
  offset : [string];
}
// TODO: Remove when possible
export type Log = {
  groupId: string;
  currentLogPosition: string;
}
