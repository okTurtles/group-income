'use strict'

import { GIErrorUIRuntimeError, L, LError } from '@common/common.js'
import {
  CHATROOM_PRIVACY_LEVEL,
  CHATROOM_TYPES,
  PROFILE_STATUS
} from '@model/contracts/shared/constants.js'
import { cloneDeep, has, omit } from 'turtledash'
import { SETTING_CHELONIA_STATE } from '@model/database.js'
import sbp from '@sbp/sbp'
import { imageUpload, objectURLtoBlob } from '@utils/image.js'
import { SETTING_CURRENT_USER } from '~/frontend/model/database.js'
import { JOINED_CHATROOM, KV_QUEUE, LOGIN, LOGOUT, LOGGING_OUT } from '~/frontend/utils/events.js'
import { SPMessage } from '@chelonia/lib/SPMessage'
import { Secret } from '@chelonia/lib/Secret'
import { encryptedIncomingData, encryptedIncomingDataWithRawKey, encryptedOutgoingData, encryptedOutgoingDataWithRawKey } from '@chelonia/lib/encryptedData'
import { rawSignedIncomingData } from '@chelonia/lib/signedData'
import { EVENT_HANDLED } from '@chelonia/lib/events'
import { findKeyIdByName } from '@chelonia/lib/utils'
import { blake32Hash } from '@chelonia/lib/functions'
import type { Key } from '@chelonia/crypto'
import { CURVE25519XSALSA20POLY1305, EDWARDS25519SHA512BATCH, deserializeKey, generateSalt, keyId, keygen, serializeKey } from '@chelonia/crypto'
import { handleFetchResult } from '../utils/misc.js'
import { encryptedAction, groupContractsByType, syncContractsInOrder } from './utils.js'

/**
 * Decrypts the old IEK list using the provided contract ID and IEK.
 *
 * @param contractID - The ID of the contract.
 * @param IEK - The encryption key object.
 * @param encryptedData - The encrypted data string, or null if not available.
 * @returns The decrypted old IEK list, or an empty array if decryption fails.
 */
const decryptOldIekList = (contractID: string, IEK: Key, encryptedData: ?string) => {
  // Return an empty array if no encrypted data is provided
  if (!encryptedData) return []

  try {
    // Parse the encrypted data from JSON format
    const parsedData = JSON.parse(encryptedData)

    // Decrypt the incoming data using the IEK and contract ID
    const decryptedData = encryptedIncomingDataWithRawKey(IEK, parsedData, `meta.private.oldKeys;${contractID}`)

    // Parse the decrypted data back into a JavaScript object
    const oldKeysList = JSON.parse(decryptedData.valueOf())

    return oldKeysList // Return the decrypted old keys
  } catch (error) {
    // Log any errors that occur during decryption
    console.error('[decryptOldIekList] Error during decryption', error)
  }

  // Don't return in case of error
}

/**
 * Decrypts the old IEK list using the provided contract ID and IEK.
 *
 * @param identityContractID - The identity contract ID
 * @param oldKeysAnchorCid - The CID corresponding to the password change message
 * @param IEK - The encryption key object.
 * @returns The decrypted old IEK list, or an empty array if decryption fails.
 */
const processOldIekList = async (identityContractID: string, oldKeysAnchorCid: string, IEK: Key) => {
  try {
    // Fetch the old keys from the server
    const result = await fetch(`${sbp('okTurtles.data/get', 'API_URL')}/file/${oldKeysAnchorCid}`).then(handleFetchResult('json'))

    // Parse the signed data in the OP_KEY_UPDATE payload to extract keys
    const oldKeys = (() => {
      const data = rawSignedIncomingData(result)
      const head = JSON.parse(data.get('head'))
      if (head.contractID !== identityContractID) {
        throw new Error('Unexpected contract ID.')
      }
      if (![SPMessage.OP_ATOMIC, SPMessage.OP_KEY_UPDATE].includes(head.op)) {
        throw new Error('Unsupported opcode: ' + head.op)
      }

      // Normalize the payload as if it were `OP_ATOMIC`
      const payload = (head.op === SPMessage.OP_KEY_UPDATE)
        ? [[SPMessage.OP_KEY_UPDATE, data.valueOf()]]
        : data.valueOf()

      // Find the key with the name 'iek', and the `meta.private.oldKeys` field
      // within it
      return payload
        .filter(([op]) => op === SPMessage.OP_KEY_UPDATE)
        .flatMap(([, keys]) => keys)
        .find((key) => key.name === 'iek' && key.meta?.private?.oldKeys)
        ?.meta.private.oldKeys
    })()

    // Check if old keys are present in the metadata
    if (!oldKeys) {
      console.error('[processOldIekList] Error finding old IEKs, logging in will probably fail due to missing keys')
    }

    // Decrypt the old IEK list
    const decryptedKeys = decryptOldIekList(identityContractID, IEK, oldKeys)

    // Check if decryption was successful
    if (!decryptedKeys) {
      console.error('[processOldIekList] Error decrypting old IEKs, logging in will probably fail due to missing keys')
    } else {
      // Map the decrypted keys to the required format
      const secretKeys = decryptedKeys.map(key => ({ key: deserializeKey(key), transient: true }))

      // Store the secret keys using the sbp function
      await sbp('chelonia/storeSecretKeys', new Secret(secretKeys))
    }
  } catch (error) {
    console.error('[processOldIekList] Error fetching or processing old keys:', error)
  }
}

/**
 * Appends a new IEK to the existing list of old IEKs.
 *
 * @param contractID - The ID of the contract.
 * @param IEK - The encryption key object.
 * @param oldIEK - The old IEK to be appended.
 * @param encryptedData - The encrypted data string, or null if not available.
 * @returns The updated encrypted data containing the new IEK.
 * @throws {Error} - Throws an error if decryption of old IEK list fails.
 */
const appendToIekList = (contractID: string, IEK: Object, oldIEK: Object, encryptedData: ?string) => {
  // Decrypt the old IEK list
  const oldKeys = decryptOldIekList(contractID, oldIEK, encryptedData)

  // If decryption fails, throw an error to prevent data loss
  if (!oldKeys) {
    throw new Error('Error decrypting old IEK list')
  }

  // Create a Set to store unique keys
  const keysSet = new Set(oldKeys)

  // Serialize the old IEK and add it to the Set
  const serializedOldIEK = serializeKey(oldIEK, true)
  keysSet.add(serializedOldIEK)

  // Encrypt the updated list of keys and return the new encrypted data
  const updatedKeysData = encryptedOutgoingDataWithRawKey(
    IEK,
    // Convert Set back to Array for serialization
    JSON.stringify(Array.from(keysSet))
  ).toString(`meta.private.oldKeys;${contractID}`)

  return updatedKeysData // Return the updated encrypted data
}

// Event handler to detect password updates
sbp('okTurtles.events/on', EVENT_HANDLED, (contractID, message) => {
  const identityContractID = sbp('state/vuex/state').loggedIn?.identityContractID
  // If the message isn't for our identity contract or it's not `OP_KEY_UPDATE`
  // (possibly within `OP_ATOMIC`), we return early
  if (contractID !== identityContractID || ![SPMessage.OP_ATOMIC, SPMessage.OP_KEY_UPDATE].includes(message.opType())) return

  // If this could have changed our CSK, let's try to get the key ID and see if
  // we have the corresponding secret key
  const hasNewCsk = sbp('chelonia/contract/currentKeyIdByName', identityContractID, 'csk', true)
  // If we do, we can still use the contract as normal
  if (hasNewCsk) return

  // Otherwise, force a logout
  console.warn('Likely password change for identity contract. Logging us out.', identityContractID)
  sbp('gi.actions/identity/logout').catch(e => {
    console.error('Error while automatically logging out', e)
  })
})

export default (sbp('sbp/selectors/register', {
  'gi.actions/identity/create': async function ({
    IPK: wIPK,
    IEK: wIEK,
    publishOptions,
    username,
    email,
    picture,
    token
  }) {
    let finalPicture = `${self.location.origin}/assets/images/user-avatar-default.png`

    // Unwrap secrets
    wIPK = wIPK.valueOf()
    wIEK = wIEK.valueOf()

    const IPK = typeof wIPK === 'string' ? deserializeKey(wIPK) : wIPK
    const IEK = typeof wIEK === 'string' ? deserializeKey(wIEK) : wIEK

    const deletionToken = 'deletionToken' + generateSalt()
    const deletionTokenHash = blake32Hash(deletionToken)

    // Create the necessary keys to initialise the contract
    const CSK = keygen(EDWARDS25519SHA512BATCH)
    const CEK = keygen(CURVE25519XSALSA20POLY1305)
    const PEK = keygen(CURVE25519XSALSA20POLY1305)
    const SAK = keygen(EDWARDS25519SHA512BATCH)

    // Key IDs
    const IPKid = keyId(IPK)
    const IEKid = keyId(IEK)
    const CSKid = keyId(CSK)
    const CEKid = keyId(CEK)
    const PEKid = keyId(PEK)
    const SAKid = keyId(SAK)

    // Public keys to be stored in the contract
    const IPKp = serializeKey(IPK, false)
    const IEKp = serializeKey(IEK, false)
    const CSKp = serializeKey(CSK, false)
    const CEKp = serializeKey(CEK, false)
    const PEKp = serializeKey(PEK, false)
    const SAKp = serializeKey(SAK, false)

    // Secret keys to be stored encrypted in the contract
    const CSKs = encryptedOutgoingDataWithRawKey(IEK, serializeKey(CSK, true))
    const CEKs = encryptedOutgoingDataWithRawKey(IEK, serializeKey(CEK, true))
    const PEKs = encryptedOutgoingDataWithRawKey(CEK, serializeKey(PEK, true))
    const SAKs = encryptedOutgoingDataWithRawKey(IEK, serializeKey(SAK, true))
    const encryptedDeletionToken = encryptedOutgoingDataWithRawKey(IEK, deletionToken)

    // Before creating the contract, put all keys into transient store
    await sbp('chelonia/storeSecretKeys',
      new Secret([IPK, IEK, CEK, CSK, PEK, SAK].map(key => ({ key, transient: true })))
    )

    let userID
    // next create the identity contract itself
    try {
      await sbp('chelonia/out/registerContract', {
        contractName: 'gi.contracts/identity',
        publishOptions: {
          ...publishOptions,
          headers: {
            ...publishOptions?.headers,
            'shelter-deletion-token-digest': deletionTokenHash,
            'shelter-namespace-registration': username,
            'shelter-salt-registration-token': token.valueOf()
          }
        },
        signingKeyId: IPKid,
        actionSigningKeyId: CSKid,
        actionEncryptionKeyId: PEKid,
        keys: [
          {
            id: IPKid,
            name: 'ipk',
            purpose: ['sig'],
            ringLevel: 0,
            permissions: '*',
            allowedActions: '*',
            meta: {
              private: {
                transient: true
              }
            },
            data: IPKp
          },
          {
            id: IEKid,
            name: 'iek',
            purpose: ['enc'],
            ringLevel: 0,
            // TODO: Does this 'gi.contracts/identity/keymeta' pseudo selector
            // make sense here? It is not being used and these types of permissions
            // can be problematic because selectors can be updated
            permissions: ['gi.contracts/identity/keymeta'],
            meta: {
              private: {
                transient: true
              }
            },
            data: IEKp
          },
          {
            id: CSKid,
            name: 'csk',
            purpose: ['sig'],
            ringLevel: 1,
            permissions: [SPMessage.OP_KEY_ADD, SPMessage.OP_KEY_DEL, SPMessage.OP_ACTION_UNENCRYPTED, SPMessage.OP_ACTION_ENCRYPTED, SPMessage.OP_ATOMIC, SPMessage.OP_CONTRACT_AUTH, SPMessage.OP_CONTRACT_DEAUTH, SPMessage.OP_KEY_SHARE, SPMessage.OP_KEY_UPDATE, SPMessage.OP_ACTION_ENCRYPTED + '#inner'],
            allowedActions: '*',
            meta: {
              private: {
                content: CSKs
              }
            },
            data: CSKp
          },
          {
            id: CEKid,
            name: 'cek',
            purpose: ['enc'],
            ringLevel: 1,
            permissions: [SPMessage.OP_ACTION_ENCRYPTED, SPMessage.OP_KEY_ADD, SPMessage.OP_KEY_DEL, SPMessage.OP_KEY_REQUEST, SPMessage.OP_KEY_REQUEST_SEEN, SPMessage.OP_KEY_SHARE, SPMessage.OP_KEY_UPDATE],
            allowedActions: '*',
            meta: {
              private: {
                content: CEKs
              }
            },
            data: CEKp
          },
          {
            id: PEKid,
            name: 'pek',
            purpose: ['enc'],
            ringLevel: 2,
            permissions: [SPMessage.OP_ACTION_ENCRYPTED],
            allowedActions: ['gi.actions/identity/setAttributes'],
            meta: {
              private: {
                content: PEKs
              }
            },
            data: PEKp
          },
          {
            id: SAKid,
            name: '#sak',
            purpose: ['sak'],
            ringLevel: 0,
            permissions: [],
            allowedActions: [],
            meta: {
              private: {
                content: SAKs
              }
            },
            data: SAKp
          }
        ],
        hooks: {
          postpublishContract: async (message) => {
            // We need to get the contract state
            await sbp('chelonia/contract/retain', message.contractID(), { ephemeral: true })

            try {
              userID = message.contractID()
              if (picture) {
                try {
                  finalPicture = await imageUpload(picture, { billableContractID: userID })
                } catch (e) {
                  console.error('actions/identity.js picture upload error:', e)
                  throw new GIErrorUIRuntimeError(L('Failed to upload the profile picture. {codeError}', { codeError: e.message }), { cause: e })
                }
              }
            } finally {
              await sbp('chelonia/contract/release', message.contractID(), { ephemeral: true })
            }
          }
        },
        data: {
          // finalPicture is set after OP_CONTRACT is sent, which is after
          // calling 'chelonia/out/registerContract' here. We use a getter for
          // `picture` so that the action sent has the correct value
          attributes: {
            username,
            email,
            get picture () { return finalPicture },
            encryptedDeletionToken: encryptedDeletionToken.serialize('encryptedDeletionToken')
          }
        }
      })

      // After the contract has been created, store persistent keys
      await sbp('chelonia/storeSecretKeys',
        new Secret([CEK, CSK, PEK, SAK].map(key => ({ key })))
      )
      // And remove transient keys, which require a user password
      sbp('chelonia/clearTransientSecretKeys', [IEKid, IPKid])
    } catch (e) {
      console.error('gi.actions/identity/create failed!', e)
      throw new GIErrorUIRuntimeError(L('Failed to create user identity: {reportError}', LError(e)), { cause: e })
    } finally {
      // And remove transient keys, which require a user password
      await sbp('chelonia/clearTransientSecretKeys', [IEKid, IPKid])
    }
    return userID
  },
  'gi.actions/identity/login': function ({ identityContractID, encryptionParams, cheloniaState, state, transientSecretKeys, oldKeysAnchorCid }) {
    // This wrapper ensures that there is at most one login flow action executed
    // at any given time. Because of the async work done when logging in and out,
    // it could happen that, e.g., `gi.actions/identity/login` is called before
    // a previous call to `gi.actions/identity/logout` completed (this should
    // not be allowed by the UI, and it'd require that users do things very
    // quickly, but using automation can cause this).
    // To prevent issues, the login and logout actions are wrapped an placed in
    // a queue.
    return sbp('okTurtles.eventQueue/queueEvent', 'ACTIONS-LOGIN', async () => {
      console.debug('[gi.actions/identity/login] Scheduled call starting', identityContractID)
      transientSecretKeys = transientSecretKeys.valueOf().map(k => ({ key: deserializeKey(k), transient: true }))

      // If running in a SW, start log capture here
      if (typeof WorkerGlobalScope === 'function') {
        await sbp('swLogs/startCapture', identityContractID)
      }
      await sbp('chelonia/reset', { ...cheloniaState, loggedIn: { identityContractID } })
      await sbp('chelonia/storeSecretKeys', new Secret(transientSecretKeys))

      if (oldKeysAnchorCid) {
        await processOldIekList(identityContractID, oldKeysAnchorCid, transientSecretKeys[0].key)
      }

      try {
        // When syncing from scratch, we need to call `retain` on our own
        // identity contract to ensure the reference count is positive and we
        // don't accidentally remove it.
        // When not syncing from scratch, we call `sync` instead, since we don't
        // want to increment the reference count every time the app is loaded.
        // To decide what to call, we don't simply check for `state` (which
        // would be defined when restoring from a saved state) because in some
        // cases the reference count could be 0, resulting in an error.
        // Instead, we check if the reference count exists. This check is
        // correct and also ensures that, if the state gets corrupted for some
        // reason (for example, because the contract is deleted from the server
        // and then restored) and the reference count lost, we call `/retain`
        // again, which will succeed and also ensure our own identity contract
        // won't get removed.
        if (!cheloniaState?.contracts[identityContractID]?.references) {
          // Make sure we don't unsubscribe from our own identity contract
          // Note that this should be done _after_ calling
          // `chelonia/storeSecretKeys`: If the following line results in
          // syncing the identity contract and fetching events, the secret keys
          // for processing them will not be available otherwise.
          await sbp('chelonia/contract/retain', identityContractID)
        } else {
          // If there is a state, we've already retained the identity contract
          // but might need to fetch the latest events
          await sbp('chelonia/contract/sync', identityContractID)
        }
      } catch (e) {
        console.error('[gi.actions/identity] Error during login contract sync', e)
        throw new GIErrorUIRuntimeError(L('Error during login contract sync'), { cause: e })
      }

      try {
        await sbp('gi.db/settings/save', SETTING_CURRENT_USER, identityContractID)
        sbp('okTurtles.events/emit', LOGIN, { identityContractID, encryptionParams, state })

        const contractIDs = groupContractsByType(cheloniaState?.contracts)
        await syncContractsInOrder(contractIDs)

        try {
          // The state above might be null, so we re-grab it
          const cheloniaState = sbp('chelonia/rootState')

          // The updated list of groups
          const groupIds = Object.keys(cheloniaState[identityContractID].groups)

          // contract sync might've triggered an async call to /remove, so
          // wait before proceeding
          // $FlowFixMe[incompatible-call]
          await sbp('chelonia/contract/wait', Array.from(new Set([...groupIds, ...Object.values(contractIDs).flat()])))

          // Call 'gi.actions/group/join' on all groups which may need re-joining
          await Promise.allSettled(
            groupIds.map(async groupId => (
              // (1) Check whether the contract exists (may have been removed
              //     after sync)
              has(cheloniaState.contracts, groupId) &&
              has(cheloniaState[identityContractID].groups, groupId) &&
              // (2) Check whether the join process is still incomplete
              //     This needs to be re-checked because it may have changed after
              //     sync
              // //     We only check for groups where we don't have a profile, as
              // //     re-joining is handled by the group contract itself.
              // !state[groupId]?.profiles?.[identityContractID] && // ?.status !== PROFILE_STATUS.
              cheloniaState[groupId]?.profiles?.[identityContractID]?.status !== PROFILE_STATUS.ACTIVE &&
              // (3) Call join
              sbp('gi.actions/group/join', {
                originatingContractID: identityContractID,
                originatingContractName: 'gi.contracts/identity',
                contractID: groupId,
                contractName: 'gi.contracts/group',
                reference: cheloniaState[identityContractID].groups[groupId].hash,
                signingKeyId: cheloniaState[identityContractID].groups[groupId].inviteSecretId,
                innerSigningKeyId: await sbp('chelonia/contract/currentKeyIdByName', identityContractID, 'csk'),
                encryptionKeyId: await sbp('chelonia/contract/currentKeyIdByName', identityContractID, 'cek')
              }).catch((e) => {
                console.error(`Error during gi.actions/group/join for ${groupId} at login`, e)
                const humanErr = L('Join group error during login: {msg}', { msg: e?.message || 'unknown error' })
                throw new GIErrorUIRuntimeError(humanErr)
              })
            ))
          )

          // update the 'lastLoggedIn' field in user's group profiles
          // note: this is immediate and only done when logging in with a password
          Object.entries(cheloniaState[identityContractID].groups)
            // $FlowFixMe[incompatible-use]
            .filter(([, { hasLeft }]) => !hasLeft)
            .forEach(([cId]) => {
              // We send this action only for groups we have fully joined (i.e.,
              // accepted an invite and added our profile)
              if (cheloniaState[cId]?.profiles?.[identityContractID]?.status === PROFILE_STATUS.ACTIVE) {
                sbp('gi.actions/group/kv/updateLastLoggedIn', { contractID: cId, throttle: false }).catch((e) => console.error('Error sending updateLastLoggedIn', e))
              }
            })
        } catch (e) {
          console.error('[gi.actions/identity/login] Error re-joining groups after login', e)
          throw e
        }

        return identityContractID
      } catch (e) {
        sbp('chelonia/clearTransientSecretKeys', transientSecretKeys.map(({ key }) => keyId(key)))
        console.error('gi.actions/identity/login failed!', e)
        const humanErr = L('Failed to log in: {reportError}', LError(e))
        await sbp('gi.actions/identity/_private/logout')
          .catch((e) => {
            console.error('[gi.actions/identity/login] Error calling logout (after failure to login)', e)
          })
        throw new GIErrorUIRuntimeError(humanErr, { cause: e })
      }
    })
  },
  // Unlike the login function, the wrapper for logging out is used using a
  // dedicated selector to allow it to be called from the login selector (if
  // error occurs)
  'gi.actions/identity/_private/logout': async function () {
    let cheloniaState
    sbp('okTurtles.events/emit', LOGGING_OUT)
    try {
      console.info('logging out, waiting for any events to finish...')
      // wait for any pending operations to finish before calling state/vuex/save
      // This includes, in order:
      //   0. Pending login events
      //   1. Actions to be sent (in the `encrypted-action` queue)
      //   2. (In reset) Actions that haven't been published yet (the
      //      `publish:${contractID}` queues)
      //   3. (In reset) Processing of any action (waiting on all the contract
      //      queues), including their side-effects (the `${contractID}` queues)
      //   4. (In reset handler) Outgoing actions from side-effects (again, in
      //      the `encrypted-action` queue)
      await sbp('okTurtles.eventQueue/queueEvent', 'encrypted-action', () => {})
      // reset will wait until we have processed any remaining actions
      cheloniaState = await sbp('chelonia/reset', async () => {
        // some of the actions that reset waited for might have side-effects
        // that send actions
        // we wait for those as well (the duplication in this case is
        // intended) -- see 4. above
        // The intent of this is to wait for all the current actions to be
        // sent and then wait until any actions that are a side-effect are sent
        // TODO: We might not need this second await and 1-3 could be fine (i.e.,
        // we could avoid waiting on these 2nd layer of actions)
        await sbp('okTurtles.eventQueue/queueEvent', 'encrypted-action', () => {})

        // NOTE: wait for all the pending KV_QUEUE invocations to be finished
        await sbp('okTurtles.eventQueue/queueEvent', KV_QUEUE, () => {})

        // See comment below for 'gi.db/settings/delete'
        const cheloniaState = await sbp('okTurtles.eventQueue/queueEvent', SETTING_CHELONIA_STATE, async () => {
          const cheloniaState = cloneDeep(sbp('chelonia/rootState'))
          await sbp('gi.db/settings/delete', SETTING_CHELONIA_STATE)
          return cheloniaState
        })
        await sbp('gi.db/settings/save', SETTING_CURRENT_USER, null)

        return cheloniaState
      }).then((cheloniaState) => {
        console.info('successfully logged out')

        return cheloniaState
      })
    } catch (e) {
      console.error(`${e.name} during logout: ${e.message}`, e)
    }
    // Clear the file cache when logging out to preserve privacy
    sbp('gi.db/filesCache/clear').catch((e) => { console.error('Error clearing file cache', e) })
    // If running inside a SW, clear logs
    if (typeof WorkerGlobalScope === 'function') {
      // clear stored logs to prevent someone else accessing sensitve data
      sbp('swLogs/pauseCapture', { wipeOut: true }).catch((e) => { console.error('Error clearing file cache', e) })
    }
    sbp('okTurtles.events/emit', LOGOUT)
    return cheloniaState
  },
  'gi.actions/identity/addJoinDirectMessageKey': async (contractID, foreignContractID, keyName) => {
    const keyId = await sbp('chelonia/contract/currentKeyIdByName', foreignContractID, keyName)
    const PEKid = await sbp('chelonia/contract/currentKeyIdByName', contractID, 'pek')
    const foreignContractState = sbp('chelonia/contract/state', foreignContractID)

    const existingForeignKeys = await sbp('chelonia/contract/foreignKeysByContractID', contractID, foreignContractID)

    if (existingForeignKeys?.includes(keyId)) {
      return
    }

    return await sbp('chelonia/out/keyAdd', {
      contractID,
      contractName: 'gi.contracts/identity',
      data: [encryptedOutgoingData(contractID, PEKid, {
        foreignKey: `shelter:${encodeURIComponent(foreignContractID)}?keyName=${encodeURIComponent(keyName)}`,
        id: keyId,
        data: foreignContractState._vm.authorizedKeys[keyId].data,
        // The OP_ACTION_ENCRYPTED is necessary to let the DM counterparty
        // that a chatroom has just been created
        permissions: [SPMessage.OP_ACTION_ENCRYPTED + '#inner'],
        allowedActions: ['gi.contracts/identity/joinDirectMessage#inner'],
        purpose: ['sig'],
        ringLevel: Number.MAX_SAFE_INTEGER,
        name: `${foreignContractID}/${keyId}`
      })],
      signingKeyId: sbp('chelonia/contract/suitableSigningKey', contractID, [SPMessage.OP_KEY_ADD], ['sig'])
    })
  },
  'gi.actions/identity/shareNewPEK': async (contractID: string, newKeys) => {
    const rootState = sbp('chelonia/rootState')
    const state = rootState[contractID]
    // TODO: Also share PEK with DMs
    await Promise.all(Object.keys(state.groups || {}).filter(groupID => !state.groups[groupID].hasLeft && !!rootState.contracts[groupID]).map(async groupID => {
      const CEKid = await sbp('chelonia/contract/currentKeyIdByName', groupID, 'cek')
      const CSKid = await sbp('chelonia/contract/currentKeyIdByName', groupID, 'csk')

      if (!CEKid || !CSKid) {
        console.warn(`Unable to share rotated keys for ${contractID} with ${groupID}: Missing CEK or CSK`)
        // We intentionally don't throw here to be able to share keys with the
        // remaining groups
        return
      }
      return sbp('chelonia/out/keyShare', {
        contractID: groupID,
        contractName: rootState.contracts[groupID].type,
        data: encryptedOutgoingData(groupID, CEKid, {
          contractID,
          // $FlowFixMe
          keys: Object.values(newKeys).map(([, newKey, newId]: [any, Key, string]) => ({
            id: newId,
            meta: {
              private: {
                content: encryptedOutgoingData(groupID, CEKid, serializeKey(newKey, true))
              }
            }
          }))
        }),
        signingKeyId: CSKid,
        hooks: {
          preSendCheck: (_, state) => {
            // Don't send this message if we're no longer a group member
            return state?.profiles?.[contractID]?.status === PROFILE_STATUS.ACTIVE
          }
        }
      }).catch(e => {
        // We may no longer be a member of the group, so we ignore errors
        // related to missing keys
        if (e.name !== 'ChelErrorSignatureKeyNotFound') {
          throw e
        }
      })
    }))

    // This selector is called by rotateKeys, which will include the keys to
    // share along with OP_KEY_UPDATE. In this case, we're sharing all keys
    // to their respective contracts and there are no keys to include in
    // the same event as OP_KEY_UPDATE. Therefore, we return undefined
    if (!newKeys.pek) return undefined
    return [
      undefined, // Nothing before OP_KEY_UPDATE
      [
        // Re-encrypt attributes with the new PEK
        await sbp('gi.actions/identity/setAttributes', {
          contractID,
          data: state.attributes,
          encryptionKey: newKeys.pek[1],
          encryptionKeyId: newKeys.pek[2],
          returnInvocation: true
        })
      ]
    ]
  },
  ...encryptedAction('gi.actions/identity/setAttributes', L('Failed to set profile attributes.'), undefined, 'pek'),
  ...encryptedAction('gi.actions/identity/updateSettings', L('Failed to update profile settings.')),
  ...encryptedAction('gi.actions/identity/createDirectMessage', L('Failed to create a new direct message channel.'), async function (sendMessage, params) {
    const rootGetters = sbp('state/vuex/getters')
    const partnerIDs = params.data.memberIDs
      .filter(memberID => memberID !== rootGetters.ourIdentityContractId)
      .map(memberID => rootGetters.ourContactProfilesById[memberID].contractID)
    const currentGroupId = params.data.currentGroupId
    const identityContractID = rootGetters.ourIdentityContractId

    const message = await sbp('gi.actions/chatroom/create', {
      data: {
        attributes: {
          name: '',
          description: '',
          privacyLevel: CHATROOM_PRIVACY_LEVEL.PRIVATE,
          type: CHATROOM_TYPES.DIRECT_MESSAGE
        }
      },
      hooks: {
        prepublish: params.hooks?.prepublish,
        postpublish: null
      }
    }, identityContractID)

    // Share the keys to the newly created chatroom with ourselves
    await sbp('gi.actions/out/shareVolatileKeys', {
      contractID: identityContractID,
      contractName: 'gi.contracts/identity',
      subjectContractID: message.contractID(),
      keyIds: '*'
    })

    await sbp('gi.actions/chatroom/join', {
      ...omit(params, ['options', 'contractID', 'data', 'hooks']),
      contractID: message.contractID(),
      data: { memberID: [identityContractID, ...partnerIDs] }
    })

    const switchChannelAfterJoined = (contractID: string) => {
      if (contractID === message.contractID()) {
        const getters = sbp('state/vuex/getters')
        if (getters.isJoinedChatRoom(contractID, identityContractID)) {
          sbp('okTurtles.events/emit', JOINED_CHATROOM, { identityContractID, groupContractID: currentGroupId, chatRoomID: message.contractID() })
          sbp('okTurtles.events/off', EVENT_HANDLED, switchChannelAfterJoined)
        }
      }
    }
    sbp('okTurtles.events/on', EVENT_HANDLED, switchChannelAfterJoined)

    await sendMessage({
      ...omit(params, ['options', 'data', 'action', 'hooks']),
      data: {
        contractID: message.contractID()
      },
      hooks: {
        onprocessed: params.hooks?.onprocessed
      }
    })

    for (let index = 0; index < partnerIDs.length; index++) {
      const hooks = index < partnerIDs.length - 1 ? undefined : { prepublish: null, postpublish: params.hooks?.postpublish }

      // Share the keys to the newly created chatroom with partners
      // TODO: We need to handle multiple groups and the possibility of not
      // having any groups in common
      await sbp('gi.actions/out/shareVolatileKeys', {
        contractID: partnerIDs[index],
        contractName: 'gi.contracts/identity',
        subjectContractID: message.contractID(),
        keyIds: '*'
      })

      await sbp('gi.actions/identity/joinDirectMessage', {
        ...omit(params, ['options', 'contractID', 'data', 'hooks']),
        contractID: partnerIDs[index],
        data: {
          // TODO: We need to handle multiple groups and the possibility of not
          // having any groups in common
          contractID: message.contractID()
        },
        // For now, we assume that we're messaging someone with whom we
        // share a group
        signingKeyId: await sbp('chelonia/contract/suitableSigningKey', partnerIDs[index], [SPMessage.OP_ACTION_ENCRYPTED], ['sig'], undefined, ['gi.contracts/identity/joinDirectMessage']),
        // See issue #2898. This works as follows:
        //   1. If using a new version of the app which uses the PEK to encrypt
        //      the foreign group CSK so that it's visible to members,
        //      `suitableSigningKey` will return a key ID (which should be the
        //      key corresponding to the CSK of a group we have in common with
        //      this user). In this case, the key corresponding to this key ID
        //      will be used (as set in `innerSigningKeyId`).
        //      `innerSigningContractID`, which is set to a common group ID, is
        //      ignored in this case.
        //   2. If using an older version of the app, in which the foreign
        //      group CSK isn't visible to us (*), `suitableSigningKey` will
        //      return `undefined`.
        //      In this case, the logic in `encryptedAction` will use
        //      `innerSigningKeyName` (implicitly, `csk`) and `innerSigningContractID`
        //      to determine the key to use in a foreign signature.
        //      Note that this works because `encryptedAction` requires
        //      `innerSigningKeyId` to be `null` to omit an inner signature if
        //      `innerSigningContractID` is given.
        //      Also note that this second case is exactly the same behaviour
        //      the app had previous to this fix.
        //
        // This logic ensures maximum backward and forward compatibility, using
        // the newer mechanism of using a key we know is valid when possible
        // and falling back to guessing that a group CSK might be valid when
        // that fails.
        //
        // (*) This situation should only happen if the app bundle for the other
        // user hasn't been updated for some reason, or if the `postUpgradeVerification`
        // hook failed to run for some reason.
        innerSigningKeyId: await sbp('chelonia/contract/suitableSigningKey', partnerIDs[index], [SPMessage.OP_ACTION_ENCRYPTED + '#inner'], ['sig'], undefined, ['gi.contracts/identity/joinDirectMessage#inner']),
        innerSigningContractID: currentGroupId,
        hooks
      })
    }

    return message.contractID()
  }),
  ...encryptedAction('gi.actions/identity/joinDirectMessage', L('Failed to join a direct message.')),
  ...encryptedAction('gi.actions/identity/joinGroup', L('Failed to join a group.')),
  ...encryptedAction('gi.actions/identity/leaveGroup', L('Failed to leave a group.')),
  ...encryptedAction('gi.actions/identity/setDirectMessageVisibility', L('Failed to set direct message visibility.')),
  'gi.actions/identity/uploadFiles': async ({ attachments, billableContractID }: {
    attachments: Array<Object>, billableContractID: string
  }) => {
    const { identityContractID } = sbp('state/vuex/state').loggedIn
    try {
      const attachmentsData = await Promise.all(attachments.map(async (attachment) => {
        const { url, compressedBlob } = attachment
        // url here is an instance of URL.createObjectURL(), which needs to be converted to a 'Blob'
        const attachmentBlob = compressedBlob || await objectURLtoBlob(url)

        const response = await sbp('chelonia/fileUpload', attachmentBlob, {
          type: attachment.mimeType,
          cipher: 'aes256gcm'
        }, { billableContractID })
        const { delete: token, download: downloadData } = response
        return {
          attributes: omit(attachment, ['url', 'compressedBlob', 'needsImageCompression']),
          downloadData,
          deleteData: { token }
        }
      }))

      const tokensByManifestCid = attachmentsData.map(({ downloadData, deleteData }) => ({
        manifestCid: downloadData.manifestCid,
        token: deleteData.token
      }))

      await sbp('gi.actions/identity/saveFileDeleteToken', {
        contractID: identityContractID,
        data: { billableContractID, tokensByManifestCid }
      })

      return attachmentsData.map(({ attributes, downloadData }) => ({ ...attributes, downloadData }))
    } catch (err) {
      const humanErr = L('Failed to upload files: {reportError}', LError(err))
      throw new GIErrorUIRuntimeError(humanErr)
    }
  },
  'gi.actions/identity/removeFiles': async ({ manifestCids, option }: {
    manifestCids: string[], option: Object
  }) => {
    const { identityContractID } = sbp('state/vuex/state').loggedIn
    const { shouldDeleteFile, shouldDeleteToken, throwIfMissingToken } = option
    let deleteResult, toDelete

    const currentIdentityState = await sbp('chelonia/contract/state', identityContractID)

    if (shouldDeleteFile) {
      const credentials = Object.fromEntries(manifestCids.map(cid => {
        // It could be that the file was already deleted, if we no longer have
        // a delete token. In this case, omit those CIDs.
        if (!throwIfMissingToken && shouldDeleteToken && !currentIdentityState.fileDeleteTokens[cid]) {
          console.info('[gi.actions/identity/removeFiles] Skipping file as token is missing', cid)
          return [cid, null]
        };
        const credential = shouldDeleteToken
          ? { token: currentIdentityState.fileDeleteTokens[cid].token }
          : { billableContractID: identityContractID }
        return [cid, credential]
      }))
      toDelete = !throwIfMissingToken ? manifestCids.filter((cid) => !!credentials[cid]) : manifestCids
      deleteResult = await sbp('chelonia/fileDelete', toDelete, credentials)
    } else {
      toDelete = manifestCids
    }

    if (shouldDeleteToken) {
      await sbp('gi.actions/identity/removeFileDeleteToken', {
        contractID: identityContractID,
        data: {
          manifestCids: deleteResult
            ? toDelete.filter((_, i) => {
              return deleteResult[i].status === 'fulfilled'
            })
            : toDelete
        }
      })
    }

    if (deleteResult?.some(r => r.status === 'rejected')) {
      console.error('[gi.actions/identity/removeFiles] Some CIDs could not be deleted',
        deleteResult?.map((r, i) => r.status === 'rejected' && toDelete[i]).filter(Boolean))
      throw new Error('Some CIDs could not be deleted')
    }
  },
  'gi.actions/identity/logout': (...params) => {
    return sbp('okTurtles.eventQueue/queueEvent', 'ACTIONS-LOGIN', ['gi.actions/identity/_private/logout', ...params])
  },
  'gi.actions/identity/changePassword': async ({
    identityContractID,
    username,
    oldIPK,
    oldIEK,
    newIPK: IPK,
    newIEK: IEK,
    updateToken,
    hooks
  }) => {
    oldIPK = oldIPK.valueOf()
    oldIEK = oldIEK.valueOf()
    IPK = IPK.valueOf()
    IEK = IEK.valueOf()
    updateToken = updateToken.valueOf()

    // Create the necessary keys to initialise the contract
    const CSK = keygen(EDWARDS25519SHA512BATCH)
    const CEK = keygen(CURVE25519XSALSA20POLY1305)
    const SAK = keygen(EDWARDS25519SHA512BATCH)

    // Key IDs
    const oldIPKid = keyId(oldIPK)
    const oldIEKid = keyId(oldIEK)
    const IPKid = keyId(IPK)
    const IEKid = keyId(IEK)
    const CSKid = keyId(CSK)
    const CEKid = keyId(CEK)
    const SAKid = keyId(SAK)

    // Public keys to be stored in the contract
    const IPKp = serializeKey(IPK, false)
    const IEKp = serializeKey(IEK, false)
    const CSKp = serializeKey(CSK, false)
    const CEKp = serializeKey(CEK, false)
    const SAKp = serializeKey(SAK, false)

    // Secret keys to be stored encrypted in the contract
    const CSKs = encryptedOutgoingDataWithRawKey(IEK, serializeKey(CSK, true))
    const CEKs = encryptedOutgoingDataWithRawKey(IEK, serializeKey(CEK, true))
    const SAKs = encryptedOutgoingDataWithRawKey(IEK, serializeKey(SAK, true))

    const state = sbp('chelonia/contract/state', identityContractID)

    // Before rotating keys the contract, put all keys into transient store
    await sbp('chelonia/storeSecretKeys',
      new Secret([oldIPK, oldIEK, IPK, IEK, CEK, CSK, SAK].map(key => ({ key, transient: true })))
    )

    const oldKeysData = appendToIekList(
      identityContractID, IEK, oldIEK,
      state._vm.authorizedKeys[oldIEKid]?.meta?.private?.oldKeys
    )

    await sbp('chelonia/out/keyUpdate', {
      contractID: identityContractID,
      contractName: 'gi.contracts/identity',
      data: [
        {
          id: IPKid,
          name: 'ipk',
          oldKeyId: oldIPKid,
          meta: {
            private: {
              transient: true
            }
          },
          data: IPKp
        },
        {
          id: IEKid,
          name: 'iek',
          oldKeyId: oldIEKid,
          meta: {
            private: {
              transient: true,
              oldKeys: oldKeysData
            }
          },
          data: IEKp
        },
        {
          id: CSKid,
          name: 'csk',
          oldKeyId: findKeyIdByName(state, 'csk'),
          meta: {
            private: {
              content: CSKs
            }
          },
          data: CSKp
        },
        {
          id: CEKid,
          name: 'cek',
          oldKeyId: findKeyIdByName(state, 'cek'),
          meta: {
            private: {
              content: CEKs
            }
          },
          data: CEKp
        },
        {
          id: SAKid,
          name: '#sak',
          oldKeyId: findKeyIdByName(state, '#sak'),
          meta: {
            private: {
              content: SAKs
            }
          },
          data: SAKp
        }
      ],
      signingKeyId: oldIPKid,
      publishOptions: {
        headers: {
          'shelter-salt-update-token': updateToken
        }
      },
      hooks
    })

    // After the contract has been updated, store persistent keys
    await sbp('chelonia/storeSecretKeys',
      new Secret([CEK, CSK, SAK].map(key => ({ key })))
    )
    // And remove transient keys, which require a user password
    sbp('chelonia/clearTransientSecretKeys', [oldIEKid, oldIPKid, IEKid, IPKid])
  },
  'gi.actions/identity/delete': async ({
    contractID,
    transientSecretKeys,
    oldKeysAnchorCid
  }: {
    contractID: string,
    transientSecretKeys: Secret<string[]>,
    oldKeysAnchorCid: string
  }) => {
    const state = sbp('chelonia/contract/state', contractID)
    if (!state?.attributes?.encryptedDeletionToken) {
      throw new Error('Missing encrypted deletion token')
    }

    const transientSecretKeysEntries = transientSecretKeys.valueOf().map(
      k => ([keyId(k), deserializeKey(k)])
    )
    const encryptedDeletionToken = state.attributes.encryptedDeletionToken

    // If there were key rotations, we need to decrypt keys using the CID of
    // the message where the (last) rotation happened.
    if (oldKeysAnchorCid) {
      const IEK = transientSecretKeysEntries[0][1]
      await processOldIekList(contractID, oldKeysAnchorCid, IEK)
    }

    const token = encryptedIncomingData(contractID, state, encryptedDeletionToken, NaN, Object.fromEntries(transientSecretKeysEntries), 'encryptedDeletionToken')

    // Before actually deleting it, leave all groups and DMs. This avoids
    // potentially leaving the UI in a weird state.
    const { ourDirectMessages, ourGroups } = sbp('state/vuex/getters')
    await Promise.all([
      ...Object.keys(ourDirectMessages).map((contractID) => {
        return sbp('gi.actions/chatroom/leave', { contractID, data: {} }).catch((e) => {
        // We make this a warning and we don't propagate the error because this
        // is not a requirement for deleting the contract.
          console.warn('Error while leaving DM before deleting identity contract', contractID, e)
        })
      }),
      ...ourGroups.map((contractID) => {
        return sbp('gi.actions/group/removeOurselves', { contractID }).catch((e) => {
        // We make this a warning and we don't propagate the error because this
        // is not a requirement for deleting the contract.
          console.warn('Error while leaving group before deleting identity contract', contractID, e)
        })
      })
    ])

    await sbp('chelonia/out/deleteContract', contractID, {
      [contractID]: { token: new Secret(token.valueOf()) }
    })
  },
  'gi.actions/identity/_ondeleted': async (contractID: string, state: Object) => {
    const ourIdentityContractId = sbp('state/vuex/getters').ourIdentityContractId

    if (contractID === ourIdentityContractId) {
      // If our own identity contract has been deleted, there isn't much more
      // that we can do on the app, so we log out. We don't wait for other running
      // _ondeleted handlers because at this point our state can no longer be
      // used, as we're no longer able to keep our identity meaningfully in sync
      // with things happening on the server.
      await sbp('gi.actions/identity/logout')
    }
  },
  ...encryptedAction('gi.actions/identity/deleteDirectMessage', L('Failed to delete direct message.')),
  ...encryptedAction('gi.actions/identity/saveFileDeleteToken', L('Failed to save delete tokens for the attachments.')),
  ...encryptedAction('gi.actions/identity/removeFileDeleteToken', L('Failed to remove delete tokens for the attachments.')),
  ...encryptedAction('gi.actions/identity/setGroupAttributes', L('Failed to set group attributes.')),
  'gi.actions/identity/upgradeGroupForeignCSKs': async (contractID: string, groupFKTuple: [string, string, string][], maxAttemptCount = 5) => {
    // See issue #2898
    // This function is called from 'state/vuex/postUpgradeVerification'
    // Group (foreign) CSKs that were encrypted with a CEK will be removed and
    // re-added being encrypted with the PEK. This allows other group members
    // to see which foreign group CSK keys exist in our identity contract, which eliminates
    // the need for 'guessing' and resolves the issue of created DM chatrooms
    // not showing up
    for (; maxAttemptCount > 0; --maxAttemptCount) {
      try {
        if (maxAttemptCount < 1) {
          console.error('[gi.actions/identity/upgradeGroupForeignCSK] Max attempts exceeded', contractID, groupFKTuple)
        }
        const state = sbp('chelonia/rootState')
        const CEKid = sbp('chelonia/contract/currentKeyIdByName', contractID, 'cek')
        const PEKid = sbp('chelonia/contract/currentKeyIdByName', contractID, 'pek')

        await Promise.all(groupFKTuple.map(([groupID]) =>
          sbp('chelonia/contract/wait', groupID)
        ))

        const verifyUpdates = () => {
          let modified = false

          const updatedGroupFKTuple = groupFKTuple.map((tuple) => {
            let [groupID, oldKeyId, newKeyId] = tuple
            // Check that we're group members
            if (!state[contractID].groups[groupID] || state[contractID].groups[groupID].hasLeft) {
              modified = true
              return null
            }
            // Check that the key we're replacing is valid
            if (!state[contractID]._vm.authorizedKeys[oldKeyId]) {
              modified = true
              return null
            }
            // The old key ID may have been rotated right before this function was
            // called
            if (state[contractID]._vm.authorizedKeys[oldKeyId]._notAfterHeight != null) {
              oldKeyId = sbp('chelonia/contract/currentKeyIdByName', contractID, state[contractID]._vm.authorizedKeys[oldKeyId])
            }
            // Check that the encryption key used originally was the CEK
            if (!state[contractID]._vm.authorizedKeys[oldKeyId]._private || state[contractID]._vm.authorizedKeys[state[contractID]._vm.authorizedKeys[oldKeyId]._private]?.name !== 'cek') {
              modified = true
              return null
            }

            // Update the group CSK to the latest
            const updatedGroupCskId = sbp('chelonia/contract/currentKeyIdByName', groupID, 'csk')
            if (newKeyId !== updatedGroupCskId) {
              modified = true
              newKeyId = updatedGroupCskId
            }

            // If we already have the new key _and_ it is already encrypted with the
            // PEK, then there's nothing to do.
            if (!state[contractID]._vm.authorizedKeys[newKeyId]._private || state[contractID]._vm.authorizedKeys[state[contractID]._vm.authorizedKeys[newKeyId]._private]?.name === 'pek') {
              modified = true
              return null
            }

            return [groupID, oldKeyId, newKeyId]
          }).filter(Boolean)

          return modified ? updatedGroupFKTuple : null
        }

        const updatedGroupFKTuple = verifyUpdates()
        if (updatedGroupFKTuple) {
          groupFKTuple = ((updatedGroupFKTuple: any): [string, string, string][])
        }

        if (groupFKTuple.length === 0) return

        // Note: We don't use OP_KEY_UPDATE
        // OP_KEY_UPDATE works on _existing_ keys. The goal of this change
        // is for others to be able to read the group CSKs in our contracts, and,
        // for them, the initial OP_KEY_ADD is not visible. Hence, OP_KEY_DEL + OP_KEY_ADD
        return await sbp('chelonia/out/atomic', {
          contractID,
          contractName: 'gi.contracts/identity',
          signingKeyId: sbp('chelonia/contract/suitableSigningKey', contractID, [SPMessage.OP_KEY_ADD], ['sig']),
          publishOptions: {
            disableAutoDedup: true
          },
          hooks: {
            beforeRequest: (newEntry) => {
              // There still is a possibility that keys in the contract have changed
              // while we're in the process of writing to it. We want to be careful
              // with this operation and only send correct updates, or else the state
              // will be broken.
              // It's currently not possible to change an SPMessage after it's
              // constructed, so if we detect any information that shouldn't be there,
              // we call this action again (to produce a corrected messge) and abort
              // the current call.
              const updatedGroupFKTuple = verifyUpdates()
              if (updatedGroupFKTuple) {
                setTimeout(() => {
                  sbp('gi.actions/identity/upgradeGroupForeignCSKs', contractID, updatedGroupFKTuple, maxAttemptCount - 1).catch((e) => {
                    console.error('[gi.actions/identity/upgradeGroupForeignCSKs] Error', contractID, groupFKTuple, e)
                  })
                }, 200)
                throw new Error('gi.actions/identity/upgradeGroupForeignCSKs: Unable to proceed as data changed.')
              }
            }
          },
          data: [
            // First, delete keys that were encrypted using the CEK
            [
              'chelonia/out/keyDel', {
                data: groupFKTuple.map(([, oldKeyId]) => encryptedOutgoingData(contractID, CEKid, oldKeyId))
              }
            ],
            // Then, add it back, using the PEK for encryption
            [
              'chelonia/out/keyAdd', {
                skipExistingKeyCheck: true,
                data: groupFKTuple.map(([groupID, oldKeyId, newKeyId]) => {
                  const oldKey = state[contractID]._vm.authorizedKeys[oldKeyId]
                  const foreignContractState = state[groupID]
                  return encryptedOutgoingData(contractID, PEKid, {
                    foreignKey: `shelter:${encodeURIComponent(groupID)}?keyName=${encodeURIComponent(foreignContractState._vm.authorizedKeys[newKeyId].name)}`,
                    id: newKeyId,
                    data: foreignContractState._vm.authorizedKeys[newKeyId].data,
                    permissions: oldKey.permissions,
                    allowedActions: oldKey.allowedActions,
                    purpose: oldKey.purpose,
                    ringLevel: oldKey.ringLevel,
                    // Intentionally using the old name in the new key to preserve
                    // continuity
                    name: oldKey.name
                  })
                })
              }
            ]
          ]
        })
      } catch (e) {
        console.warn('[gi.actions/identity/upgradeGroupForeignCSKs] Error on attempted send', contractID, groupFKTuple, maxAttemptCount)
      }
    }
  }
}): string[])
