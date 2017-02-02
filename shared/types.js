/* eslint no-undef: "off", no-unused-vars: "off" */

// Run flow with: `yarn flow` OR `yarn run flow`

// Start Here: https://flowtype.org/docs/syntax.html
// From: https://flowtype.org/docs/builtins.html#mixed
// https://flowtype.org/docs/declarations.html
// https://flowtype.org/docs/modules.html#import-type
// https://flowtype.org/docs/advanced-configuration.html

// =======================
// Common/universal types
// =======================

export type JSONType = string | number | boolean | null | JSONObject | JSONArray;
export type JSONObject = { [key:string]: JSONType };
export type JSONArray = Array<JSONType>;

// =======================
// Application-specific types
// =======================

export type ResType =
  | ResTypeErr | ResTypeOK | ResTypeAlready
  | ResTypeJoined | ResTypeLeft | ResTypeEntry
export type ResTypeErr = 'error'
export type ResTypeOK = 'success'
export type ResTypeAlready = 'already'
export type ResTypeJoined = 'joined'
export type ResTypeLeft = 'left'
export type ResTypeEntry = 'entry'

export type EntryType = EntryPayment | EntryCreation | EntryVoting
export type EntryPayment = 'payment'
export type EntryCreation = 'creation' // TODO: better, more specific name
export type EntryVoting = 'voting'

// export type Entry = { // <- was causing problems
export interface Entry {
  type: EntryType;
  data: JSONObject;
  parentHash: string | null;
  version: string;
}

// NOTE: If Flow isn't making any sense try changing this from a type to an interface!
// https://github.com/facebook/flow/issues/3041
export type Response = {
// export interface Response {
  type: ResType;
  err?: string;
  data?: JSONType
}

export type Group = {
  creationDate: string;
  groupName: string;
  sharedValues: string;
  changePercentage: number;
  openMembership: boolean;
  memberApprovalPercentage: number;
  memberRemovalPercentage: number;
  contributionPrivacy: string;
  founderHashKey: string;
}
