'use strict'

// keep in sync with ChelRegParams
export type GIRegParams = {
  contractID?: string; // always set on contract actions, but not when creating a contract
  data: Object;
  options?: Object; // these are options for the action wrapper
  namespaceRegistration: ?string;
  hooks?: Object;
  publishOptions?: Object
}

// keep in sync with ChelActionParams
export type GIActionParams = {
  action: string;
  contractID: string;
  data: Object;
  options?: Object; // these are options for the action wrapper
  signingKeyId: ?string;
  encryptionKeyId: ?string;
  originatingContractID: ?string;
  signingContractID: ?string;
  innerSigningContractID: ?string;
  innerSigningKeyId: ?string;
  hooks?: {
    preSendCheck?: null | (Object, Object) => boolean;
    prepublishContract?: null | (Object) => void;
    prepublish?: null | (Object) => void | Promise<*>;
    postpublish?: null | (Object) => void | Promise<*>;
    onprocessed?: null | (Object) => void;
  };
  publishOptions?: { maxAttempts: number };
  returnInvocation?: boolean;
}
