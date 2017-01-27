// TODO: edit .flowconfig to unignore this file

// Two most useful FlowType docs:
// https://flowtype.org/docs/quick-reference.html
// https://flowtype.org/docs/objects.html
// https://flowtype.org/docs/functions.html
// Useful reading on ES6 classes:
// http://www.benmvp.com/learning-es6-classes/
// https://www.sitepoint.com/object-oriented-javascript-deep-dive-es6-classes/

// TODO: merge with event-log.js
export class Backend {
  async retrieveGroup (id) {} // resolves to a Group object
  async retrieveIdentity (id) {} // resolves to an Identity object (IPNS?)
  async createGroup (group) {}
  async createIdentity (identity) {}
}

// TODO: merge with pubsub
// must be compatible with tor
export class MessageRelay {
  sendEphemeralMsg (groupOrIdentity, msg) {}
  sendLogMsg (group, msg) {}
}

// =======================
// Utility classes
// =======================

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

export class Operation {}
export class OpManageOps extends Operation {}
export class OpSign extends Operation {}

// =======================
// Contracts — classes representing immutable code
// =======================

export class IdentityContract {
  constructor () {
    this.statements = []
  }
}
