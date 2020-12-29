'use strict'

import scrypt from 'scrypt-async'

export class Key {
  constructor (privKey, pubKey, salt) {
    this.privKey = privKey
    this.pubKey = pubKey // optional
    this.salt = salt // optional
  }

  encrypt (data) {}

  decrypt (data) {}

  signMessage (msg) {}

  verifySignature (msg, sig) {}

  // serialization
  serialize (savePrivKey = false) {
  }
}

// To store user's private key:
// var keys = Crypto.randomKeypair()
// var passKey = Crypto.keyFromPassword(password)
// var encryptedKeys = passKey.encrypt(keys.serialize(true))
export class Crypto {
  // TODO: make sure to NEVER store private key to the log.
  static randomKeypair () {
    // return randomly generated asymettric keypair via new Key()
  }

  static randomKey () {
    // return randomly generated symmetric key via new Key()
  }

  static randomSalt () {
    // return random salt
  }

  // we use dchest/scrypt-async-js in browser
  // TODO: use barrysteyn/node-scrypt in node/electrum
  static keyFromPassword (password) {
    const salt = Crypto.randomSalt()
    // TODO: use proper parameters. https://github.com/dchest/scrypt-async-js
    const opts = { N: 16384, r: 8, p: 1 }
    return new Promise(resolve => scrypt(password, salt, opts, resolve))
  }
}
