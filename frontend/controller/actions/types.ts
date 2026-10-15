'use strict'

// keep in sync with ChelRegParams
export type GIRegParams = {
  contractID?: string; // always set on contract actions, but not when creating a contract
  data: any;
  options?: any; // these are options for the action wrapper
  namespaceRegistration: string | null | undefined;
  hooks?: any;
  publishOptions?: any
}

// keep in sync with ChelActionParams
export type GIActionParams = {
  action: string;
  contractID: string;
  data: any;
  options?: any; // these are options for the action wrapper
  signingKeyId: string | null | undefined;
  encryptionKeyId: string | null | undefined;
  originatingContractID: string | null | undefined;
  signingContractID: string | null | undefined;
  innerSigningContractID: string | null | undefined;
  innerSigningKeyId: string | null | undefined;
  hooks?: {
    preSendCheck?: null | ((a: any, b: any) => boolean);
    prepublishContract?: null | ((a: any) => void);
    prepublish?: null | ((a: any) => Promise<void>);
    postpublish?: null | ((a: any) => Promise<void>);
    onprocessed?: null | ((a?: any) => Promise<void>);
  };
  publishOptions?: { maxAttempts: number };
  returnInvocation?: boolean;
}
