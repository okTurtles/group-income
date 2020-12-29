'use strict'
// import sbp from '~/shared/sbp.js'
import { blake32Hash } from './functions.js'
import type { JSONType } from './types.js'

function defaultSignatureFn (data: string) {
  return blake32Hash(data)
}

export class GIMessage {
  // flow type annoations to make flow happy
  _message: Object

  _mapping: Object

  // NOTE: the JSON string generated here must be preserved forever.
  //       do not ever regenerate this message using the contructor.
  //       instead store it using serialize() and restore it using
  //       deserialize().
  static create (
    contractID: ?string = null,
    previousHEAD: ?string = null,
    signatureFn: Function = defaultSignatureFn,
    actionType: string,
    actionData: JSONType,
    metaData: ?Object = {}
  ) {
    const instance = new this()
    instance._message = {
      version: 1,
      previousHEAD,
      contractID,
      // TODO: this action object needs to be encrypted JSON
      action: {
        type: actionType,
        data: actionData,
        meta: metaData,
        // make it difficult to predict message contents and prevent conflicts
        nonce: Math.random()
      }
    }
    const messageJSON = JSON.stringify(instance._message)
    const value = JSON.stringify({
      message: messageJSON,
      sig: signatureFn(messageJSON)
    })
    instance._mapping = {
      key: blake32Hash(value),
      value
    }
    return instance
  }

  static deserialize (value: string) {
    if (!value) throw new Error(`deserialize bad value: ${value}`)
    const instance = new this()
    instance._mapping = { key: blake32Hash(value), value }
    instance._message = JSON.parse(JSON.parse(value).message)
    return instance
  }

  message (): Object { return this._message }

  type (): string { return this.message().action.type }

  data (): Object { return this.message().action.data }

  meta (): Object { return this.message().action.meta }

  isFirstMessage (): boolean { return !this.message().previousHEAD }

  contractID (): string { return this.message().contractID || this.hash() }

  serialize (): string { return this._mapping.value }

  hash (): string { return this._mapping.key }
  // signWithKey (key: Uint8Array) { this._sig = nacl.sign.detached(this.toProtobuf(), key) }
  // get signature (): Buffer { return this._sig }
  // set signature (sig: Buffer) { this._sig = sig }
}
