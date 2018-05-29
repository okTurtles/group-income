'use strict'

import {verify} from '../../../../shared/functions'
import {HashableContract, HashableAction} from '../../../../shared/events'

// =======================
// NOTE: this file is not used and will be deleted soon.
//       the classes within it are being slowly migrated to: /shared/events.js
// =======================

// http://www.indelible.org/ink/protobuf-polymorphism/

export class Operation extends HashableAction {
  // TODO: make these TypeScript annotations
  static TYPE_SIGN = 'sign'
  constructor ({authorizedKeys}) {
    super()
    // an array of single 'Key's, or objects of the form:
    // {keys: [Key], thresholdN: Number} // the 'n' of 'n of m'
    // {keys: [Key], thresholdP: Number} // percentage of keys
    this.authorizedKeys = authorizedKeys
  }
}
export class OpManageOps extends Operation {}
export class OpSign extends Operation {
  constructor (config) {
    super(config)
    this.msgTypes = config.msgTypes // TODO: TypeScript annotations
  }
  handlesMessageType (type) {
    return this.msgTypes === '*' || this.msgTypes.some(t => t === type)
  }
  // TODO: add type annotation for 'msg'
  verifyMessageSignature (msg) {
    if (!this.handlesMessageType(msg)) throw Error(`can't verify signature fo unhandled message type: ${msg.type}`)
    return this.authorizedKeys.some(key => verify(msg.data, key, msg.sig))
  }
}

export class IdentityContract extends HashableContract {
  static actions = {}
  constructor ({ownerPubKey, attributes}) {
    super()
    // this.attestations: Array<Signable> = []
    this.attributes = attributes // object of things like "name", "email" etc
    this.attestations = []
    this.operations = [new OpManageOps({authorizedKeys: [ownerPubKey]})]
  }
  addOperation (operation: Operation) {
    // TODO: verify that the operation is authorized to be added
    this.operations.push(operation)
  }
  addAttestation (attestation) {
    if (!this.verifyMessageSignature(attestation)) throw Error('attestation sig invalid!')
    this.attestations.push(attestation)
  }
  verifyMessageSignature (msg) {
    this.operations.filter(op => op.type === Operation.TYPE_SIGN)
      .filter(op => op.handlesMessageType(msg.type))
      .some(op => op.verifyMessageSignature(msg))
  }
  isMemberOf (groupId) {
    // returns an array of statements, each with an ‘isValid’
    // property that is true IFF at least one current key of
    // a current signing operation has signed off on it.
    // return this.attestations.filter(this.verifySignature).any(s => s.memberOf(groupId))
  }
}
