import type { JSONArray, JSONObject, JSONType } from '~/shared/types.flow.js'

export type GIKeyType = ''

export type GIKey = {
  type: GIKeyType;
  data: Object; // based on GIKeyType this will change
  meta: Object;
}
// Allows server to check if the user is allowed to register this type of contract
// TODO: rename 'type' to 'contractName':
export type GIOpContract = { type: string; keyJSON: string, parentContract?: string }
export type GIOpActionEncrypted = string // encrypted version of GIOpActionUnencrypted
export type GIOpActionUnencrypted = { action: string; data: JSONType; meta: JSONObject }
export type GIOpKeyAdd = { keyHash: string, keyJSON: ?string, context: string }
export type GIOpPropSet = { key: string, value: JSONType }

export type GIOpType = 'c' | 'ae' | 'au' | 'ka' | 'kd' | 'pu' | 'ps' | 'pd'
export type GIOpValue = GIOpContract | GIOpActionEncrypted | GIOpActionUnencrypted | GIOpKeyAdd | GIOpPropSet
export type GIOp = [GIOpType, GIOpValue]

export type GIMessage = {
  _decrypted: GIOpValue;
  _mapping: Object;
  _message: Object;

  decryptedValue (fn?: Function): any;

  message (): Object;

  op (): GIOp;

  opType (): GIOpType;

  opValue (): GIOpValue;

  manifest (): string;

  description (): string;

  isFirstMessage (): boolean;
  contractID (): string;
  serialize (): string;
  hash (): string;
}
