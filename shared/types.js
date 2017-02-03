/* eslint no-undef: "off", no-unused-vars: "off" */

// Run flow with: `yarn flow` OR `yarn run flow`

// Start Here: https://flowtype.org/docs/syntax.html
// From: https://flowtype.org/docs/builtins.html#mixed
// https://flowtype.org/docs/declarations.html
// https://flowtype.org/docs/modules.html#import-type
// https://flowtype.org/docs/advanced-configuration.html

export type JSONType = string | number | boolean | null | JSONObject | JSONArray;
export type JSONObject = { [key:string]: JSONType };
export type JSONArray = Array<JSONType>;

export type ResType =
  | ResTypeErr | ResTypeOK | ResTypeAlready
  | ResTypeJoined | ResTypeLeft | ResTypeEntry
export type ResTypeErr = 'error'
export type ResTypeOK = 'success'
export type ResTypeAlready = 'already'
export type ResTypeJoined = 'joined'
export type ResTypeLeft = 'left'
export type ResTypeEntry = 'entry'

// NOTE: If Flow isn't making any sense try changing this from a type to an interface!
// https://github.com/facebook/flow/issues/3041
export type Response = {
// export interface Response {
  type: ResType;
  err?: string;
  data?: JSONType
}
