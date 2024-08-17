'use strict'

import { GIErrorUIRuntimeError, L, LError } from '@common/common.js'
import {
  CHATROOM_PRIVACY_LEVEL,
  CHATROOM_TYPES,
  PROFILE_STATUS
} from '@model/contracts/shared/constants.js'
import { has, omit, cloneDeep } from '@model/contracts/shared/giLodash.js'
import sbp from '@sbp/sbp'
import { imageUpload, objectURLtoBlob } from '@utils/image.js'
import { SETTING_CURRENT_USER } from '~/frontend/model/database.js'
import { LOGIN, LOGOUT, KV_QUEUE } from '~/frontend/utils/events.js'
import { GIMessage } from '~/shared/domains/chelonia/GIMessage.js'
import { Secret } from '~/shared/domains/chelonia/Secret.js'
import { encryptedOutgoingData, encryptedOutgoingDataWithRawKey } from '~/shared/domains/chelonia/encryptedData.js'
// Using relative path to crypto.js instead of ~-path to workaround some esbuild bug
import { CURVE25519XSALSA20POLY1305, EDWARDS25519SHA512BATCH, serializeKey, keyId, keygen, deserializeKey } from '../../../shared/domains/chelonia/crypto.js'
import type { Key } from '../../../shared/domains/chelonia/crypto.js'
import { encryptedAction, groupContractsByType, syncContractsInOrder } from './utils.js'

export default (sbp('sbp/selectors/register', {
  'gi.actions/identity/create': async function ({
    IPK,
    IEK,
    publishOptions,
    username,
    email,
    picture,
    r,
    s,
    sig,
    Eh
  }) {
    let finalPicture = `${self.location.origin}/assets/images/user-avatar-default.png`

    IPK = typeof IPK === 'string' ? deserializeKey(IPK) : IPK
    IEK = typeof IEK === 'string' ? deserializeKey(IEK) : IEK

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

    // Before creating the contract, put all keys into transient store
    await sbp('chelonia/storeSecretKeys',
      new Secret([IPK, IEK, CEK, CSK, PEK, SAK].map(key => ({ key, transient: true })))
    )

    let userID
    // next create the identity contract itself
    try {
      await sbp('chelonia/out/registerContract', {
        contractName: 'gi.contracts/identity',
        publishOptions,
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
            permissions: [GIMessage.OP_KEY_ADD, GIMessage.OP_KEY_DEL, GIMessage.OP_ACTION_UNENCRYPTED, GIMessage.OP_ACTION_ENCRYPTED, GIMessage.OP_ATOMIC, GIMessage.OP_CONTRACT_AUTH, GIMessage.OP_CONTRACT_DEAUTH, GIMessage.OP_KEY_SHARE, GIMessage.OP_KEY_UPDATE, GIMessage.OP_ACTION_ENCRYPTED + '#inner'],
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
            permissions: [GIMessage.OP_ACTION_ENCRYPTED, GIMessage.OP_KEY_ADD, GIMessage.OP_KEY_DEL, GIMessage.OP_KEY_REQUEST, GIMessage.OP_KEY_REQUEST_SEEN, GIMessage.OP_KEY_SHARE, GIMessage.OP_KEY_UPDATE],
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
            permissions: [GIMessage.OP_ACTION_ENCRYPTED],
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
            await sbp('chelonia/contract/sync', message.contractID())

            // Register password salt
            const res = await fetch(`${sbp('okTurtles.data/get', 'API_URL')}/zkpp/register/${encodeURIComponent(username)}`, {
              method: 'POST',
              headers: {
                'authorization': await sbp('chelonia/shelterAuthorizationHeader', message.contractID()),
                'content-type': 'application/x-www-form-urlencoded'
              },
              body: new URLSearchParams({
                'r': r,
                's': s,
                'sig': sig,
                'Eh': Eh
              })
            })

            if (!res.ok) {
              throw new Error('Unable to register hash')
            }

            userID = message.contractID()
            if (picture) {
              try {
                finalPicture = await imageUpload(picture, { billableContractID: userID })
              } catch (e) {
                console.error('actions/identity.js picture upload error:', e)
                throw new GIErrorUIRuntimeError(L('Failed to upload the profile picture. {codeError}', { codeError: e.message }), { cause: e })
              }
            }
          }
        },
        data: {
          // finalPicture is set after OP_CONTRACT is sent, which is after
          // calling 'chelonia/out/registerContract' here. We use a getter for
          // `picture` so that the action sent has the correct value
          attributes: { username, email, get picture () { return finalPicture } }
        },
        namespaceRegistration: username
      })

      // After the contract has been created, store pesistent keys
      await sbp('chelonia/storeSecretKeys',
        new Secret([CEK, CSK, PEK].map(key => ({ key })))
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
  'gi.actions/identity/_private/login': async function ({ identityContractID, encryptionParams, cheloniaState, state, transientSecretKeys }) {
    transientSecretKeys = transientSecretKeys.map(k => ({ key: deserializeKey(k.valueOf()), transient: true }))

    await sbp('chelonia/reset', { ...cheloniaState, loggedIn: { identityContractID } })
    await sbp('chelonia/storeSecretKeys', new Secret(transientSecretKeys))

    try {
      if (!state) {
        // Make sure we don't unsubscribe from our own identity contract
        // Note that this should be done _after_ calling
        // `chelonia/storeSecretKeys`: If the following line results in
        // syncing the identity contract and fetching events, the secret keys
        // for processing them will not be available otherwise.
        await sbp('chelonia/contract/retain', identityContractID)
      } else {
        // If there is a state, we've already retained the identity contract
        // but might need to fetch the latest events
        await sbp('chelonia/contract/sync', identityContractID, { force: true })
      }
    } catch (e) {
      console.error('Error during login contract sync', e)
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
      } catch (e) {
        console.error('[gi.actions/identity/login] Error re-joining groups after login', e)
        throw e
      }

      return identityContractID
    } catch (e) {
      sbp('chelonia/clearTransientSecretKeys', transientSecretKeys.map(({ key }) => keyId(key)))
      console.error('gi.actions/identity/login failed!', e)
      const humanErr = L('Failed to login: {reportError}', LError(e))
      await sbp('gi.actions/identity/_private/logout')
        .catch((e) => {
          console.error('[gi.actions/identity/login] Error calling logout (after failure to login)', e)
        })
      throw new GIErrorUIRuntimeError(humanErr, { cause: e })
    }
  },
  'gi.actions/identity/signupAndLogin': async function ({ username, email, passwordFn }) {
    const contractIDs = await sbp('gi.actions/identity/signup', { username, email, passwordFn })
    await sbp('gi.actions/identity/login', { username, passwordFn })
    return contractIDs
  },
  'gi.actions/identity/_private/logout': async function () {
    let cheloniaState
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
      cheloniaState = await sbp('chelonia/rootState')
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
        const cheloniaState = await sbp('okTurtles.eventQueue/queueEvent', 'CHELONIA_STATE', async () => {
          const cheloniaState = cloneDeep(sbp('chelonia/rootState'))
          await sbp('gi.db/settings/delete', 'CHELONIA_STATE')
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
    sbp('okTurtles.events/emit', LOGOUT)
    return cheloniaState
  },
  'gi.actions/identity/addJoinDirectMessageKey': async (contractID, foreignContractID, keyName) => {
    const keyId = await sbp('chelonia/contract/currentKeyIdByName', foreignContractID, keyName)
    const CEKid = await sbp('chelonia/contract/currentKeyIdByName', contractID, 'cek')

    const rootState = sbp('state/vuex/state')
    const foreignContractState = rootState[foreignContractID]

    const existingForeignKeys = await sbp('chelonia/contract/foreignKeysByContractID', contractID, foreignContractID)

    if (existingForeignKeys?.includes(keyId)) {
      return
    }

    return await sbp('chelonia/out/keyAdd', {
      contractID,
      contractName: 'gi.contracts/identity',
      data: [encryptedOutgoingData(contractID, CEKid, {
        foreignKey: `sp:${encodeURIComponent(foreignContractID)}?keyName=${encodeURIComponent(keyName)}`,
        id: keyId,
        data: foreignContractState._vm.authorizedKeys[keyId].data,
        // The OP_ACTION_ENCRYPTED is necessary to let the DM counterparty
        // that a chatroom has just been created
        permissions: [GIMessage.OP_ACTION_ENCRYPTED + '#inner'],
        allowedActions: ['gi.contracts/identity/joinDirectMessage#inner'],
        purpose: ['sig'],
        ringLevel: Number.MAX_SAFE_INTEGER,
        name: `${foreignContractID}/${keyId}`
      })],
      signingKeyId: sbp('chelonia/contract/suitableSigningKey', contractID, [GIMessage.OP_KEY_ADD], ['sig'])
    })
  },
  'gi.actions/identity/shareNewPEK': async (contractID: string, newKeys) => {
    const rootState = sbp('state/vuex/state')
    const state = rootState[contractID]
    // TODO: Also share PEK with DMs
    await Promise.all(Object.keys(state.groups || {}).filter(groupID => !!rootState.contracts[groupID]).map(async groupID => {
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
          contractID: groupID,
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
    return undefined
  },
  ...encryptedAction('gi.actions/identity/setAttributes', L('Failed to set profile attributes.'), undefined, 'pek'),
  ...encryptedAction('gi.actions/identity/updateSettings', L('Failed to update profile settings.')),
  ...encryptedAction('gi.actions/identity/createDirectMessage', L('Failed to create a new direct message channel.'), async function (sendMessage, params) {
    const rootState = sbp('state/vuex/state')
    // TODO: Can't use rootGetters
    const rootGetters = sbp('state/vuex/getters')
    const partnerIDs = params.data.memberIDs.map(memberID => rootGetters.ourContactProfilesById[memberID].contractID)
    // NOTE: 'rootState.currentGroupId' could be changed while waiting for the sbp functions to be proceeded
    //       So should save it as a constant variable 'currentGroupId', and use it which can't be changed
    const currentGroupId = rootState.currentGroupId

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
    }, rootState.loggedIn.identityContractID)

    // Share the keys to the newly created chatroom with ourselves
    await sbp('gi.actions/out/shareVolatileKeys', {
      contractID: rootState.loggedIn.identityContractID,
      contractName: 'gi.contracts/identity',
      subjectContractID: message.contractID(),
      keyIds: '*'
    })

    await sbp('gi.actions/chatroom/join', {
      ...omit(params, ['options', 'contractID', 'data', 'hooks']),
      contractID: message.contractID(),
      data: {}
    })

    for (const partnerID of partnerIDs) {
      await sbp('gi.actions/chatroom/join', {
        ...omit(params, ['options', 'contractID', 'data', 'hooks']),
        contractID: message.contractID(),
        data: { memberID: partnerID }
      })
    }

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
        // For now, we assume that we're messaging someone which whom we
        // share a group
        signingKeyId: await sbp('chelonia/contract/suitableSigningKey', partnerIDs[index], [GIMessage.OP_ACTION_ENCRYPTED], ['sig'], undefined, ['gi.contracts/identity/joinDirectMessage']),
        innerSigningContractID: currentGroupId,
        hooks
      })
    }
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
        const { mimeType, url } = attachment
        // url here is an instance of URL.createObjectURL(), which needs to be converted to a 'Blob'
        const attachmentBlob = await objectURLtoBlob(url)
        const response = await sbp('chelonia/fileUpload', attachmentBlob, {
          type: mimeType, cipher: 'aes256gcm'
        }, { billableContractID })
        const { delete: token, download: downloadData } = response
        return {
          attributes: omit(attachment, ['url']),
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
        data: { tokensByManifestCid }
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
          ? { token: currentIdentityState.fileDeleteTokens[cid] }
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
  'gi.actions/identity/login': (...params) => {
    return sbp('okTurtles.eventQueue/queueEvent', 'ACTIONS-LOGIN', ['gi.actions/identity/_private/login', ...params])
  },
  'gi.actions/identity/logout': (...params) => {
    return sbp('okTurtles.eventQueue/queueEvent', 'ACTIONS-LOGIN', ['gi.actions/identity/_private/logout', ...params])
  },
  ...encryptedAction('gi.actions/identity/saveFileDeleteToken', L('Failed to save delete tokens for the attachments.')),
  ...encryptedAction('gi.actions/identity/removeFileDeleteToken', L('Failed to remove delete tokens for the attachments.'))
}): string[])
