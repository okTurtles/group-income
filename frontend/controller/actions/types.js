'use strict'

// keep in sync with ChelRegParams
export type GIRegParams = {
  contractID?: string; // always set on contract actions, but not when creating a contract
  data: Object;
  options?: Object; // these are options for the action wrapper
  hooks?: Object;
  publishOptions?: Object
}

// keep in sync with ChelActionParams
export type GIActionParams = {
  action: string;
  contractID: string;
  data: Object;
  options?: Object; // these are options for the action wrapper
  signingKeyId: string;
  encryptionKeyId: ?string;
  hooks?: {
    prepublishContract?: (Object) => void;
    prepublish?: (Object) => void;
    postpublish?: (Object) => void;
  };
  publishOptions?: { maxAttempts: number };
}
