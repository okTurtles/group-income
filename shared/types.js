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

import type {EvType, EvTypeErr, EvTypeOK} from './constants'
export type {EvType, EvTypeErr, EvTypeOK}

export type Response =
  // | {event: EvTypeErr; err: string; data?: JSONType}
  // https://github.com/facebook/flow/issues/3041
  | {event: EvTypeErr; err: JSONType; data?: JSONType}
  | {event: EvTypeOK; data: JSONType}
