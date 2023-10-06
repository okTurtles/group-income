'use strict'

import sbp from '@sbp/sbp'
import localforage from 'localforage'
import { CURVE25519XSALSA20POLY1305, decrypt, encrypt, generateSalt, keyId, keygen, serializeKey } from '../../shared/domains/chelonia/crypto.js'

if (process.env.LIGHTWEIGHT_CLIENT !== 'true') {
  const log = localforage.createInstance({
    name: 'Group Income',
    storeName: 'Contracts'
  })
  // use localforage for storage
  sbp('sbp/selectors/overwrite', {
    'chelonia/db/get': key => log.getItem(key),
    // TODO: handle QuotaExceededError
    'chelonia/db/set': (key, value) => log.setItem(key, value),
    'chelonia/db/delete': (key: string) => log.removeItem(key)
  })
  sbp('sbp/selectors/lock', ['chelonia/db/get', 'chelonia/db/set', 'chelonia/db/delete'])
}

// =======================
// App settings to persist state across sessions
// =======================

const appSettings = localforage.createInstance({
  name: 'Group Income',
  storeName: 'Settings'
})

// Utility class to represent an empty state during error handling
class EmptyValue extends Error {}

export const SETTING_CURRENT_USER = '@settings/currentUser'

sbp('sbp/selectors/register', {
  'gi.db/settings/save': function (user: string, value: any): Promise<*> {
    return appSettings.setItem(user, value)
  },
  'gi.db/settings/load': function (user: string): Promise<any> {
    return appSettings.getItem(user)
  },
  'gi.db/settings/delete': function (user: string): Promise<Object> {
    return appSettings.removeItem(user)
  },
  'gi.db/settings/saveEncrypted': async function (user: string, value: any, encryptionParams: any): Promise<*> {
    const {
      stateEncryptionKeyId,
      salt,
      encryptedStateEncryptionKey
    } = encryptionParams
    // Fetch the session encryption key
    const stateEncryptionKeyS = await appSettings.getItem(stateEncryptionKeyId)
    if (!stateEncryptionKeyS) throw new Error(`Unable to retrieve the key corresponding to key ID ${stateEncryptionKeyId}`)
    // Encrypt the current state
    const encryptedState = encrypt(stateEncryptionKeyS, JSON.stringify(value), user)
    // Save the three fields of the encrypted state:
    //   (1) stateEncryptionKeyId
    //   (2) salt
    //   (3) encryptedStateEncryptionKey (used for recovery when re-logging in)
    //   (4) encryptedState
    return appSettings.setItem(user, `${stateEncryptionKeyId}.${salt}.${encryptedStateEncryptionKey}.${encryptedState}}`)
  },
  'gi.db/settings/loadEncrypted': function (user: string, stateKeyEncryptionKeyFn): Promise<*> {
    return appSettings.getItem(user).then(async (encryptedValue) => {
      if (!encryptedValue || typeof encryptedValue !== 'string') {
        throw new EmptyValue(`Unable to retrive state for ${user || ''}`)
      }
      // Split the encrypted state into its constituent parts
      const [stateEncryptionKeyId, salt, encryptedStateEncryptionKey, data] = encryptedValue.split('.')

      // If the state encryption key is in appSettings, retrieve it
      let stateEncryptionKeyS = await appSettings.getItem(stateEncryptionKeyId)

      // If the state encryption key wasn't in appSettings but we have a state
      // state key encryption derivation function (stateKeyEncryptionKeyFn),
      // call it
      if (!stateEncryptionKeyS && stateKeyEncryptionKeyFn) {
        // Derive a temporary key from the password to decrypt the state
        // encryption key
        const stateKeyEncryptionKey = await stateKeyEncryptionKeyFn(stateEncryptionKeyId, salt)

        // Decrypt the state encryption key
        stateEncryptionKeyS = decrypt(stateKeyEncryptionKey, encryptedStateEncryptionKey, stateEncryptionKeyId)

        // Compute the key ID of the decrypted key and verify that it holds
        // the expected value
        const stateEncryptionKeyIdActual = keyId(stateEncryptionKeyS)
        if (stateEncryptionKeyIdActual !== stateEncryptionKeyId) {
          throw new Error(`Invalid state key ID: expected ${stateEncryptionKeyId} but got ${stateEncryptionKeyIdActual}`)
        }
      }

      // Now, attempt to decrypt the state
      const value = JSON.parse(decrypt(stateEncryptionKeyS, data, user || ''))

      // Saving the state encryption key in appSettings is necessary for
      // functionality such as refreshing the page to work
      await appSettings.setItem(stateEncryptionKeyId, stateEncryptionKeyS)

      return {
        encryptionParams: {
          stateEncryptionKeyId,
          salt,
          encryptedStateEncryptionKey
        },
        value
      }
    }).catch(async (e) => {
      // If we haven't got a password, we can't proceed deriving keys or
      // encrypting, so we give up at this point
      if (!stateKeyEncryptionKeyFn) { throw e }

      // If the state was empty, this isn't necessarily an error
      if (!(e instanceof EmptyValue)) {
        console.warn('Error while retrieving local state', e)
      }

      // Create the necessary keys
      // First, we generate the state encryption key
      const stateEncryptionKey = keygen(CURVE25519XSALSA20POLY1305)
      const stateEncryptionKeyId = keyId(stateEncryptionKey)
      const stateEncryptionKeyS = serializeKey(stateEncryptionKey, true)

      // Once we have the state encryption key, we generate a salt
      const salt = generateSalt()

      // We use the salt, the state encryption key ID and the password to
      // derive a key to encrypt the state encryption key
      // This key is not stored anywhere, but is used for reconstructing
      // the state on a fresh session
      const stateKeyEncryptionKey = await stateKeyEncryptionKeyFn(stateEncryptionKeyId, salt)

      // Once everything is place, encrypt the state encryption key
      const encryptedStateEncryptionKey = encrypt(stateKeyEncryptionKey, stateEncryptionKeyS, stateEncryptionKeyId)

      // Save the state encryption key to local storage
      await appSettings.setItem(stateEncryptionKeyId, stateEncryptionKeyS)

      return {
        encryptionParams: {
          stateEncryptionKeyId,
          salt,
          encryptedStateEncryptionKey
        },
        value: null
      }
    })
  },
  'gi.db/settings/deleteStateEncryptionKey': function ({ stateEncryptionKeyId }): Promise<Object> {
    return appSettings.removeItem(stateEncryptionKeyId)
  }
})

// =======================
// Save file blobs here
//
// TODO: handle automatically deleting old files when we
//       approach cache limits.
// =======================

const files = localforage.createInstance({
  name: 'Group Income',
  storeName: 'Files'
})

sbp('sbp/selectors/register', {
  'gi.db/files/save': function (url: string, blob: Blob): Promise<*> {
    return files.setItem(url, blob).then(v => {
      console.log('successfully saved:', url)
    }).catch(e => {
      console.error('error saving:', url, e)
    })
  },
  'gi.db/files/load': function (url: string): Promise<Blob> {
    return files.getItem(url)
  },
  'gi.db/files/delete': function (url: string): Promise<Blob> {
    return files.removeItem(url)
  }
})

// ======================================
// Archve for proposals and anything else
// ======================================

const archive = localforage.createInstance({
  name: 'Group Income',
  storeName: 'Archive'
})

sbp('sbp/selectors/register', {
  'gi.db/archive/save': function (key: string, value: any): Promise<*> {
    return archive.setItem(key, value)
  },
  'gi.db/archive/load': function (key: string): Promise<any> {
    return archive.getItem(key)
  },
  'gi.db/archive/delete': function (key: string): Promise<Object> {
    return archive.removeItem(key)
  },
  'gi.db/archive/clear': function (): Promise<any> {
    return archive.clear()
  }
})
