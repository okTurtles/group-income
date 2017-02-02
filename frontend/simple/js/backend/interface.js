// Handy reading on ES6 classes:
// http://www.benmvp.com/learning-es6-classes/
// https://www.sitepoint.com/object-oriented-javascript-deep-dive-es6-classes/

import type {Entry} from '../../../../shared/types'

export class Backend {
  publishLogEntry (groupId: string, entry: Entry, hash?: string) {}
  subscribe (groupId: string) {}
  unsubscribe (groupId: string) {}
  subscriptions () {}
  // TODO: these
  // async createIdentity (identity) {}
  // async getIdentity (id) {}
}

// =======================
// Utility classes
// =======================

/*
export class Key {
  constructor (privKey, pubKey?) {
    this.privKey = privKey
    this.pubKey = pubKey
  }
  encrypt (data) {}
  decrypt (data) {}
  signMessage (msg) {}
  verifySignature (msg, sig) {}
}
*/

// =======================
// Contracts & related classes. "Contracts" represent immutable code.
// =======================

export class Operation {}
export class OpManageOps extends Operation {}
export class OpSign extends Operation {}

export class IdentityContract {
  constructor () {
    this.statements = []
  }
}
