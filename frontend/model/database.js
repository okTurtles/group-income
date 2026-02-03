'use strict'

import sbp from '@sbp/sbp'
import { CURVE25519XSALSA20POLY1305, decrypt, encrypt, generateSalt, keyId, keygen, serializeKey } from '@chelonia/crypto'

const _instances: (() => Promise<*>)[] = []
// Localforage-like API for IndexedDB
const localforage = {
  async ready () {
    await Promise.all(_instances.map((lazyInitDb) => lazyInitDb()))
  },
  createInstance ({ name, storeName }: { name: string, storeName: string }) {
    // Open the IndexedDB database
    // We lazy load the IndexedDB, because before we were loading it when this
    // file was imported, but on iOS IndexedDB is not available in the service
    // worker when the PWA is in the background.
    // <https://bugs.webkit.org/show_bug.cgi?id=283793>
    // So for that reason, and potentially other situations where IndexedDB
    // might not be available, we lazy load it like this upon creation.
    const lazyInitDb = (() => {
      let promise
      return () => {
        if (!promise) {
          promise = new Promise((resolve, reject) => {
            if (name.includes('-') || storeName.includes('-')) {
              reject(new Error('Unsupported characters in name: -'))
              return
            }

            const openDB = (version?: number) => {
              // By default `version` is the latest DB version. Initially, we
              // try to open that, but in some cases (e.g., when manually
              // deleting the DBs), the schema will be wrong and miss the object
              // store. In these cases, we need to upgrade the DB by
              // incrementing the version number to re-create the schema, which
              // can only be done when the DB is being 'upgraded'.
              const request = self.indexedDB.open(name + '--' + storeName, version)

              // Create the object store if it doesn't exist
              request.onupgradeneeded = (event) => {
                const db = event.target.result
                db.createObjectStore(storeName)
              }

              request.onsuccess = (event) => {
                const db = event.target.result
                if (!db.objectStoreNames.contains(storeName)) {
                  return openDB(db.version + 1)
                }

                resolve(db)
              }

              request.onerror = (error) => {
                reject(error)
              }

              // If this happens, closing all tabs and stopping the SW could
              // help.
              request.onblocked = (event) => {
                reject(new Error('DB is blocked'))
              }
            }

            openDB()
          })
        }
        return promise
      }
    })()

    _instances.push(lazyInitDb)

    return {
      async clear () {
        const db = await lazyInitDb()
        const transaction = db.transaction([storeName], 'readwrite')
        const objectStore = transaction.objectStore(storeName)
        const request = objectStore.clear()
        return new Promise((resolve, reject) => {
          request.onsuccess = () => {
            resolve()
          }
          request.onerror = (e) => {
            reject(e)
          }
        })
      },
      async getItem (key: string) {
        const db = await lazyInitDb()
        const transaction = db.transaction([storeName], 'readonly')
        const objectStore = transaction.objectStore(storeName)
        const request = objectStore.get(key)
        return new Promise((resolve, reject) => {
          request.onsuccess = (event) => {
            resolve(event.target.result)
          }
          request.onerror = (e) => {
            reject(e)
          }
        })
      },
      async removeItem (key: string) {
        const db = await lazyInitDb()
        const transaction = db.transaction([storeName], 'readwrite')
        const objectStore = transaction.objectStore(storeName)
        const request = objectStore.delete(key)
        return new Promise((resolve, reject) => {
          request.onsuccess = () => {
            resolve()
          }
          request.onerror = (e) => {
            reject(e.target.error)
          }
        })
      },
      async removeMany (keys: string[]) {
        const db = await lazyInitDb()
        const transaction = db.transaction([storeName], 'readwrite')
        const objectStore = transaction.objectStore(storeName)

        for (const key of keys) {
          objectStore.delete(key)
        }

        return new Promise((resolve, reject) => {
          transaction.oncomplete = () => resolve()
          transaction.onerror = (e) => reject(e.target.error)
          transaction.onabort = (e) => reject(e.target.error)
        })
      },
      async setItem (key: string, value: any) {
        const db = await lazyInitDb()
        const transaction = db.transaction([storeName], 'readwrite')
        const objectStore = transaction.objectStore(storeName)
        const request = objectStore.put(value, key)
        return new Promise((resolve, reject) => {
          request.onsuccess = () => {
            resolve()
          }
          request.onerror = (e) => {
            reject(e.target.error)
          }
        })
      }
    }
  }
}

export const generateEncryptionParams = async (stateKeyEncryptionKeyFn: (stateEncryptionKeyId: string, salt: string) => Promise<*>): Promise<{ encryptionParams: {
  stateEncryptionKeyId: string,
  salt: string,
  encryptedStateEncryptionKey: string
}, stateEncryptionKeyP: string }> => {
  // Create the necessary keys
  // First, we generate the state encryption key
  const stateEncryptionKey = keygen(CURVE25519XSALSA20POLY1305)
  const stateEncryptionKeyId = keyId(stateEncryptionKey)
  const stateEncryptionKeyS = serializeKey(stateEncryptionKey, true)
  const stateEncryptionKeyP = serializeKey(stateEncryptionKey, false)

  // Once we have the state encryption key, we generate a salt
  const salt = generateSalt()

  // We use the salt, the state encryption key ID and the password to
  // derive a key to encrypt the state encryption key
  // This key is not stored anywhere, but is used for reconstructing
  // the state on a fresh session
  const stateKeyEncryptionKey = await stateKeyEncryptionKeyFn(stateEncryptionKeyId, salt)

  // Once everything is place, encrypt the state encryption key
  const encryptedStateEncryptionKey = encrypt(stateKeyEncryptionKey, stateEncryptionKeyS, stateEncryptionKeyId)

  return {
    encryptionParams: {
      stateEncryptionKeyId,
      salt,
      encryptedStateEncryptionKey
    },
    stateEncryptionKeyP
  }
}

if (process.env.LIGHTWEIGHT_CLIENT !== 'true') {
  const log = localforage.createInstance({
    name: 'Group Income',
    storeName: 'Contracts'
  })
  // use localforage for storage
  sbp('sbp/selectors/overwrite', {
    'chelonia.db/get': key => log.getItem(key),
    // TODO: handle QuotaExceededError
    'chelonia.db/set': (key, value) => log.setItem(key, value),
    'chelonia.db/delete': (key: string) => log.removeItem(key)
  })
  sbp('sbp/selectors/lock', ['chelonia.db/get', 'chelonia.db/set', 'chelonia.db/delete'])
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
export const SETTING_CHELONIA_STATE = 'CHELONIA_STATE'

sbp('sbp/selectors/register', {
  'gi.db/ready': function () {
    return localforage.ready()
  },
  'gi.db/settings/save': function (key: string, value: any): Promise<*> {
  // Items in the DB have a prefix to disambiguate their type.
  //  'u' means unencrypted data
  //  'e' means encrypted data
  //  'k' means that it's a cryptographic key (used for encrypted data)
  // This allows us to store encrypted and unencrypted states for the same key
    return appSettings.setItem('u' + key, value)
  },
  'gi.db/settings/load': function (key: string): Promise<any> {
    return appSettings.getItem('u' + key)
  },
  'gi.db/settings/delete': function (key: string): Promise<Object> {
    return appSettings.removeItem('u' + key)
  },
  'gi.db/settings/saveEncrypted': async function (key: string, value: any, encryptionParams: any): Promise<*> {
    const {
      stateEncryptionKeyId,
      salt,
      encryptedStateEncryptionKey
    } = encryptionParams
    // Fetch the session encryption key
    const stateEncryptionKeyP = await appSettings.getItem('k' + stateEncryptionKeyId)
    if (!stateEncryptionKeyP) throw new Error(`Unable to retrieve the key corresponding to key ID ${stateEncryptionKeyId}`)
    // Encrypt the current state
    const encryptedState = encrypt(stateEncryptionKeyP, JSON.stringify(value), key)
    // Save the four fields of the encrypted state. We use base64 encoding to
    // allow saving any incoming data.
    //   (1) stateEncryptionKeyId
    //   (2) salt
    //   (3) encryptedStateEncryptionKey (used for recovery when re-logging in)
    //   (4) encryptedState
    return appSettings.setItem('e' + key, `${btoa(stateEncryptionKeyId)}.${btoa(salt)}.${btoa(encryptedStateEncryptionKey)}.${btoa(encryptedState)}`).finally(() => {
      // Delete the unencypted setting key, if it exists
      sbp('gi.db/settings/delete', key).catch(e => {
        console.error('[gi.db/settings/saveEncrypted] Error deleting unencrypted data for key', key, e)
      })
    })
  },
  'gi.db/settings/loadEncrypted': function (key: string, stateKeyEncryptionKeyFn: (stateEncryptionKeyId: string, salt: string) => Promise<*>): Promise<*> {
    return appSettings.getItem('e' + key).then(async (encryptedValue) => {
      if (!encryptedValue || typeof encryptedValue !== 'string') {
        throw new EmptyValue(`Unable to retrive state for ${key || ''}`)
      }
      // Split the encrypted state into its constituent parts
      const [stateEncryptionKeyId, salt, encryptedStateEncryptionKey, data] = encryptedValue.split('.').map(x => atob(x))

      // Derive a temporary key from the password to decrypt the state
      // encryption key
      const stateKeyEncryptionKey = await stateKeyEncryptionKeyFn(stateEncryptionKeyId, salt)

      // Decrypt the state encryption key
      const stateEncryptionKeyS = decrypt(stateKeyEncryptionKey, encryptedStateEncryptionKey, stateEncryptionKeyId)

      // Compute the key ID of the decrypted key and verify that it holds
      // the expected value
      const stateEncryptionKeyIdActual = keyId(stateEncryptionKeyS)
      if (stateEncryptionKeyIdActual !== stateEncryptionKeyId) {
        throw new Error(`Invalid state key ID: expected ${stateEncryptionKeyId} but got ${stateEncryptionKeyIdActual}`)
      }

      // Now, attempt to decrypt the state
      const value = JSON.parse(decrypt(stateEncryptionKeyS, data, key || ''))

      // Saving the state encryption key in appSettings is necessary for
      // functionality such as refreshing the page to work
      await appSettings.setItem('k' + stateEncryptionKeyId, stateEncryptionKeyS)

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

      const { encryptionParams, stateEncryptionKeyP } = await generateEncryptionParams(stateKeyEncryptionKeyFn)

      // Save the state encryption key to local storage
      await appSettings.setItem('k' + encryptionParams.stateEncryptionKeyId, stateEncryptionKeyP)

      return {
        encryptionParams,
        value: null
      }
    })
  },
  'gi.db/settings/deleteStateEncryptionKey': function ({ stateEncryptionKeyId }): Promise<Object> {
    return appSettings.removeItem('k' + stateEncryptionKeyId)
  },
  'gi.db/settings/deleteEncrypted': function (key: string): Promise<Object> {
    return appSettings.removeItem('e' + key)
  }
})

// =======================
// Save file blobs here
//
// TODO: handle automatically deleting old files when we
//       approach cache limits.
// =======================

const filesCache = localforage.createInstance({
  name: 'Group Income',
  storeName: 'Files Cache'
})

const maxFileEntries = 100

sbp('sbp/selectors/register', {
  'gi.db/filesCache/save': async function (cacheKey: string, blob: Blob): Promise<*> {
    if (cacheKey.startsWith('__')) throw new Error('Invalid key')
    const keys = await filesCache.getItem('keys') ?? []

    // We need to perform several operations in the DB, which includes
    // the operation requested (i.e., saving a file) and updating the `keys`
    // entry for caching, as well as possibly deleting cached entries.
    // Because the `keys` entry is a point of contention among calls and we
    // can only perform a single storage operation at the same time, we use
    // a queue to ensure that all operations are done atomically.
    return sbp('okTurtles.eventQueue/queueEvent', 'gi.db/files', () => {
      return filesCache.setItem(cacheKey, blob).then(async v => {
        console.log('successfully saved:', cacheKey)
        const idx = keys.indexOf(cacheKey)
        if (idx !== -1) {
          // Remove current entry
          keys.splice(idx, 1)
        }
        // And bring it to the top
        keys.push(cacheKey)
        // If the list gets too long, remove the last element
        if (keys.length > maxFileEntries) {
          const last = keys.splice(0, keys.length - maxFileEntries)
          await Promise.all(last.map((e) => filesCache.removeItem(e)))
        }
        // Save the new current keys
        await filesCache.setItem('keys', keys)
      }).catch(e => {
        console.error('error saving:', cacheKey, e)
      })
    })
  },
  'gi.db/filesCache/load': async function (cacheKey: string): Promise<Blob> {
    if (cacheKey.startsWith('__')) throw new Error('Invalid key')
    const file = await filesCache.getItem(cacheKey)
    if (file) {
      // No await here so that we can return early
      sbp('okTurtles.eventQueue/queueEvent', 'gi.db/files', async () => {
        const keys = await filesCache.getItem('keys') ?? []
        const idx = keys.indexOf(cacheKey)
        if (idx !== -1) {
          // Bring entry to the top
          keys.splice(idx, 1)
          keys.push(cacheKey)
          await filesCache.setItem('keys', keys)
        }
      }).catch(e => {
        console.error('[gi.db/filesCache/load] Error updating keys')
      })
    }
    return ((file: any): Blob)
  },
  'gi.db/filesCache/delete': async function (cacheKey: string): Promise<void> {
    if (cacheKey.startsWith('__')) throw new Error('Invalid key')
    await filesCache.removeItem(cacheKey)
    // No await here so that we can return early
    sbp('okTurtles.eventQueue/queueEvent', 'gi.db/files', async () => {
      const keys = await filesCache.getItem('keys') ?? []
      const idx = keys.indexOf(cacheKey)
      if (idx !== -1) {
        keys.splice(idx, 1)
        await filesCache.setItem('keys', keys)
      }
    }).catch(e => {
      console.error('[gi.db/filesCache/delete] Error updating keys')
    })
  },
  'gi.db/filesCache/clear': async function (): Promise<void> {
    await filesCache.clear()
  },
  'gi.db/filesCache/temporary/save': function (cacheKey: string, blob: Blob): Promise<*> {
    if (cacheKey.startsWith('__')) throw new Error('Invalid key')
    return sbp('gi.db/filesCache/save', `temporary/${cacheKey}/`, blob)
  },
  'gi.db/filesCache/temporary/load': function (cacheKey: string): Promise<Blob> {
    if (cacheKey.startsWith('__')) throw new Error('Invalid key')
    return sbp('gi.db/filesCache/load', `temporary/${cacheKey}/`)
  },
  'gi.db/filesCache/temporary/delete': function (cacheKey: string): Promise<void> {
    if (cacheKey.startsWith('__')) throw new Error('Invalid key')
    return sbp('gi.db/filesCache/delete', `temporary/${cacheKey}/`)
  },
  'gi.db/filesCache/temporary/clear': function () {
    sbp('okTurtles.eventQueue/queueEvent', 'gi.db/files', async () => {
      const keys = await filesCache.getItem('keys') ?? []
      const allTempKeys = keys.filter(k => k.startsWith('temporary/'))
      await filesCache.removeMany(allTempKeys)
    }).catch(e => {
      console.error('[gi.db/filesCache/temporary/clear] Error removing temporary keys', e)
    })
  }
})

// ======================================
// Archive for proposals and anything else
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

// ======================================
// Application logs, used for the SW logs
// ======================================

const logs = localforage.createInstance({
  name: 'Group Income',
  storeName: 'Logs'
})

sbp('sbp/selectors/register', {
  'gi.db/logs/save': function (key: string, value: any): Promise<*> {
    return logs.setItem(key, value)
  },
  'gi.db/logs/load': function (key: string): Promise<any> {
    return logs.getItem(key)
  },
  'gi.db/logs/delete': function (key: string): Promise<Object> {
    return logs.removeItem(key)
  },
  'gi.db/logs/clear': function (): Promise<any> {
    return logs.clear()
  }
})

// ======================================
// Chatroom message drafts.
// ======================================

const chatDrafts = localforage.createInstance({
  name: 'Group Income',
  storeName: 'Chat Drafts'
})

sbp('sbp/selectors/register', {
  'gi.db/chatDrafts/save': function (key: string, value: any): Promise<*> {
    return chatDrafts.setItem(key, value)
  },
  'gi.db/chatDrafts/load': function (key: string): Promise<any> {
    return chatDrafts.getItem(key)
  },
  'gi.db/chatDrafts/delete': function (key: string): Promise<Object> {
    return chatDrafts.removeItem(key)
  },
  'gi.db/chatDrafts/clear': function (): Promise<any> {
    return chatDrafts.clear()
  }
})
