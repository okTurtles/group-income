'use strict'

import { GIErrorUIRuntimeError, L, LError, LTags } from '@common/common.js'
import {
  CHATROOM_PRIVACY_LEVEL,
  CHATROOM_TYPES,
  PROFILE_STATUS
} from '@model/contracts/shared/constants.js'
import { has, omit } from '@model/contracts/shared/giLodash.js'
import sbp from '@sbp/sbp'
import { imageUpload, objectURLtoBlob } from '@utils/image.js'
import { SETTING_CURRENT_USER } from '~/frontend/model/database.js'
import { LOGIN, LOGIN_ERROR, LOGOUT, UNREAD_MESSAGES_QUEUE } from '~/frontend/utils/events.js'
import { KV_KEYS } from '~/frontend/utils/constants.js'
import { GIMessage } from '~/shared/domains/chelonia/GIMessage.js'
import { boxKeyPair, buildRegisterSaltRequest, computeCAndHc, decryptContractSalt, hash, hashPassword, randomNonce } from '~/shared/zkpp.js'
import { findKeyIdByName } from '~/shared/domains/chelonia/utils.js'
import { encryptedOutgoingData, encryptedOutgoingDataWithRawKey } from '~/shared/domains/chelonia/encryptedData.js'
// Using relative path to crypto.js instead of ~-path to workaround some esbuild bug
import { CURVE25519XSALSA20POLY1305, EDWARDS25519SHA512BATCH, deriveKeyFromPassword, keyId, keygen, serializeKey } from '../../../shared/domains/chelonia/crypto.js'
import type { Key } from '../../../shared/domains/chelonia/crypto.js'
import { handleFetchResult } from '../utils/misc.js'
import { encryptedAction } from './utils.js'

export default (sbp('sbp/selectors/register', {
  'gi.actions/identity/retrieveSalt': async (username: string, passwordFn: () => string) => {
    const r = randomNonce()
    const b = hash(r)
    const authHash = await fetch(`${sbp('okTurtles.data/get', 'API_URL')}/zkpp/${encodeURIComponent(username)}/auth_hash?b=${encodeURIComponent(b)}`)
      .then(handleFetchResult('json'))

    const { authSalt, s, sig } = authHash

    const h = await hashPassword(passwordFn(), authSalt)

    const [c, hc] = computeCAndHc(r, s, h)

    const contractHash = await fetch(`${sbp('okTurtles.data/get', 'API_URL')}/zkpp/${encodeURIComponent(username)}/contract_hash?${(new URLSearchParams({
      'r': r,
      's': s,
      'sig': sig,
      'hc': Buffer.from(hc).toString('base64').replace(/\//g, '_').replace(/\+/g, '-').replace(/=*$/, '')
    })).toString()}`).then(handleFetchResult('text'))

    return decryptContractSalt(c, contractHash)
  },
  'gi.actions/identity/create': async function ({
    data: { username, email, passwordFn, picture },
    publishOptions
  }) {
    const password = passwordFn()
    let finalPicture = `${window.location.origin}/assets/images/user-avatar-default.png`

    // proceed with creation
    const keyPair = boxKeyPair()
    const r = Buffer.from(keyPair.publicKey).toString('base64').replace(/\//g, '_').replace(/\+/g, '-')
    const b = hash(r)
    // TODO: use the contractID instead, and move this code down below the registration
    const registrationRes = await fetch(`${sbp('okTurtles.data/get', 'API_URL')}/zkpp/register/${encodeURIComponent(username)}`, {
      method: 'POST',
      headers: {
        'content-type': 'application/x-www-form-urlencoded'
      },
      body: `b=${encodeURIComponent(b)}`
    })
      .then(handleFetchResult('json'))

    const { p, s, sig } = registrationRes

    const [contractSalt, Eh] = await buildRegisterSaltRequest(p, keyPair.secretKey, password)

    // Create the necessary keys to initialise the contract
    const IPK = await deriveKeyFromPassword(EDWARDS25519SHA512BATCH, password, contractSalt)
    const IEK = await deriveKeyFromPassword(CURVE25519XSALSA20POLY1305, password, contractSalt)
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
    sbp('chelonia/storeSecretKeys',
      () => [IPK, IEK, CEK, CSK, PEK, SAK].map(key => ({ key, transient: true }))
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
                'authorization': sbp('chelonia/shelterAuthorizationHeader', message.contractID()),
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
                throw new GIErrorUIRuntimeError(L('Failed to upload the profile picture. {codeError}', { codeError: e.message }))
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
      sbp('chelonia/storeSecretKeys',
        () => [CEK, CSK, PEK].map(key => ({ key }))
      )
      // And remove transient keys, which require a user password
      sbp('chelonia/clearTransientSecretKeys', [IEKid, IPKid])
    } catch (e) {
      console.error('gi.actions/identity/create failed!', e)
      throw new GIErrorUIRuntimeError(L('Failed to create user identity: {reportError}', LError(e)))
    }
    return userID
  },
  'gi.actions/identity/signup': async function ({ username, email, passwordFn }, publishOptions) {
    try {
      const randomAvatar = sbp('gi.utils/avatar/create')
      const userID = await sbp('gi.actions/identity/create', {
        data: {
          username,
          email,
          passwordFn,
          picture: randomAvatar
        },
        publishOptions
      })
      return userID
    } catch (e) {
      await sbp('gi.actions/identity/logout') // TODO: should this be here?
      console.error('gi.actions/identity/signup failed!', e)
      const message = LError(e)
      if (e.name === 'GIErrorUIRuntimeError') {
        // 'gi.actions/identity/create' also sets reportError
        message.reportError = e.message
      }
      throw new GIErrorUIRuntimeError(L('Failed to signup: {reportError}', message))
    }
  },
  'gi.actions/identity/login': async function ({ username, passwordFn, identityContractID }: {
    username: ?string, passwordFn: ?() => string, identityContractID: ?string
  }) {
    if (username) {
      identityContractID = await sbp('namespace/lookup', username)
    }

    if (!identityContractID) {
      throw new GIErrorUIRuntimeError(L('Incorrect username or password'))
    }

    try {
      sbp('appLogs/startCapture', identityContractID)

      const password = passwordFn?.()
      const transientSecretKeys = []
      if (password) {
        try {
          const salt = await sbp('gi.actions/identity/retrieveSalt', username, passwordFn)
          const IEK = await deriveKeyFromPassword(CURVE25519XSALSA20POLY1305, password, salt)
          transientSecretKeys.push({ key: IEK, transient: true })
        } catch (e) {
          console.error('caught error calling retrieveSalt:', e)
          throw new GIErrorUIRuntimeError(L('Incorrect username or password'))
        }
      }

      const { encryptionParams, value: state } = await sbp('gi.db/settings/loadEncrypted', identityContractID, password && ((stateEncryptionKeyId, salt) => {
        return deriveKeyFromPassword(CURVE25519XSALSA20POLY1305, password, salt + stateEncryptionKeyId)
      }))

      const contractIDs = Object.create(null)
      // login can be called when no settings are saved (e.g. from Signup.vue)
      if (state) {
        // The retrieved local data might need to be completed in case it was originally saved
        // under an older version of the app where fewer/other Vuex modules were implemented.
        sbp('state/vuex/postUpgradeVerification', state)
        sbp('state/vuex/replace', state)
        sbp('chelonia/pubsub/update') // resubscribe to contracts since we replaced the state
        // $FlowFixMe[incompatible-use]
        Object.entries(state.contracts).forEach(([id, { type }]) => {
          if (!contractIDs[type]) {
            contractIDs[type] = []
          }
          contractIDs[type].push(id)
        })
      }

      await sbp('gi.db/settings/save', SETTING_CURRENT_USER, identityContractID)

      const loginAttributes = { identityContractID, encryptionParams, username }

      // If username was not provided, retrieve it from the state
      if (!loginAttributes.username) {
        loginAttributes.username = Object.entries(state.namespaceLookups)
          .find(([k, v]) => v === identityContractID)
          ?.[0]
      }

      sbp('state/vuex/commit', 'login', loginAttributes)
      await sbp('chelonia/storeSecretKeys', () => transientSecretKeys)

      // We need to sync contracts in this order to ensure that we have all the
      // corresponding secret keys. Group chatrooms use group keys but there's
      // no OP_KEY_SHARE, which will result in the keys not being available when
      // the group keys are rotated.
      // TODO: This functionality could be moved into Chelonia by keeping track
      // of when secret keys without OP_KEY_SHARE become available.
      const contractSyncPriorityList = [
        'gi.contracts/identity',
        'gi.contracts/group',
        'gi.contracts/chatroom'
      ]
      const getContractSyncPriority = (key) => {
        const index = contractSyncPriorityList.indexOf(key)
        return index === -1 ? contractSyncPriorityList.length : index
      }

      // loading the website instead of stalling out.
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
      } catch (err) {
        sbp('okTurtles.events/emit', LOGIN_ERROR, { username, identityContractID, error: err })
        const errMessage = err?.message || String(err)
        console.error('Error during login contract sync', errMessage)

        const promptOptions = {
          heading: L('Login error'),
          question: L('Do you want to log out? {br_}Error details: {err}.', { err: err.message, ...LTags() }),
          primaryButton: L('No'),
          secondaryButton: L('Yes')
        }

        const result = await sbp('gi.ui/prompt', promptOptions)
        if (!result) {
          return sbp('gi.actions/identity/logout')
        } else {
          throw err
        }
      }

      // NOTE: update chatRoomUnreadMessages to the latest one we do this here
      //       just after the identity contract is synced because
      //       while syncing the chatroom contract it could be necessary to update chatRoomUnreadMessages
      await sbp('gi.actions/identity/loadChatRoomUnreadMessages')

      try {
        // $FlowFixMe[incompatible-call]
        await Promise.all(Object.entries(contractIDs).sort(([a], [b]) => {
          // Sync contracts in order based on type
          return getContractSyncPriority(a) - getContractSyncPriority(b)
        }).map(([, ids]) => {
          return sbp('okTurtles.eventQueue/queueEvent', `login:${identityContractID ?? '(null)'}`, ['chelonia/contract/sync', ids, { force: true }])
        }))
      } catch (err) {
        alert(L('Sync error during login: {msg}', { msg: err?.message || 'unknown error' }))
        console.error('Error during contract sync upon login (syncing all contractIDs)', err)
      }

      try {
        // The state above might be null, so we re-grab it
        const state = sbp('state/vuex/state')

        // The updated list of groups
        const groupIds = Object.keys(state[identityContractID].groups)

        // contract sync might've triggered an async call to /remove, so
        // wait before proceeding
        // $FlowFixMe[incompatible-call]
        await sbp('chelonia/contract/wait', Array.from(new Set([...groupIds, ...Object.values(contractIDs).flat()])))

        // Call 'gi.actions/group/join' on all groups which may need re-joining
        await Promise.allSettled(
          groupIds.map(groupId => (
            // (1) Check whether the contract exists (may have been removed
            //     after sync)
            has(state.contracts, groupId) &&
              has(state[identityContractID].groups, groupId) &&
              // (2) Check whether the join process is still incomplete
              //     This needs to be re-checked because it may have changed after
              //     sync
              // //     We only check for groups where we don't have a profile, as
              // //     re-joining is handled by the group contract itself.
              // !state[groupId]?.profiles?.[identityContractID] && // ?.status !== PROFILE_STATUS.
              state[groupId]?.profiles?.[identityContractID]?.status !== PROFILE_STATUS.ACTIVE &&
              // (3) Call join
              sbp('gi.actions/group/join', {
                originatingContractID: identityContractID,
                originatingContractName: 'gi.contracts/identity',
                contractID: groupId,
                contractName: 'gi.contracts/group',
                reference: state[identityContractID].groups[groupId].hash,
                signingKeyId: state[identityContractID].groups[groupId].inviteSecretId,
                innerSigningKeyId: sbp('chelonia/contract/currentKeyIdByName', identityContractID, 'csk'),
                encryptionKeyId: sbp('chelonia/contract/currentKeyIdByName', identityContractID, 'cek')
              }).catch((e) => {
                alert(L('Join group error during login: {msg}', { msg: e?.message || 'unknown error' }))
                console.error(`Error during gi.actions/group/join for ${groupId} at login`, e)
              })
          ))
        )

        // update the 'lastLoggedIn' field in user's group profiles
        Object.keys(state[identityContractID].groups)
          .forEach(cId => {
            // We send this action only for groups we have fully joined (i.e.,
            // accepted an invite and added our profile)
            if (state[cId]?.profiles?.[identityContractID]?.status === PROFILE_STATUS.ACTIVE) {
              sbp('gi.actions/group/updateLastLoggedIn', { contractID: cId }).catch((e) => console.error('Error sending updateLastLoggedIn', e))
            }
          })

        // NOTE: users could notice that they leave the group by someone
        // else when they log in
        if (!state.currentGroupId) {
          const gId = Object.keys(state.contracts)
            .find(cID => has(state[identityContractID].groups, cID))

          if (gId) {
            sbp('gi.actions/group/switch', gId)
          }
        }
      } catch (e) {
        alert(L('Error during login: {msg}', { msg: e?.message || 'unknown error' }))
        console.error('[gi.actions/identity/login] Error re-joining groups after login', e)
      } finally {
        sbp('okTurtles.events/emit', LOGIN, { username, identityContractID })
      }

      return identityContractID
    } catch (e) {
      console.error('gi.actions/identity/login failed!', e)
      const humanErr = L('Failed to login: {reportError}', LError(e))
      alert(humanErr)
      await sbp('gi.actions/identity/logout')
        .catch((e) => {
          console.error('[gi.actions/identity/login] Error calling logout (after failure to login)', e)
        })
      throw new GIErrorUIRuntimeError(humanErr)
    }
  },
  'gi.actions/identity/signupAndLogin': async function ({ username, email, passwordFn }) {
    const contractIDs = await sbp('gi.actions/identity/signup', { username, email, passwordFn })
    await sbp('gi.actions/identity/login', { username, passwordFn })
    return contractIDs
  },
  'gi.actions/identity/logout': async function () {
    try {
      const state = sbp('state/vuex/state')
      console.info('logging out, waiting for any events to finish...')
      // wait for any pending operations to finish before calling state/vuex/save
      // This includes, in order:
      //   1. Actions to be sent (in the `encrypted-action` queue)
      //   2. (In reset) Actions that haven't been published yet (the
      //      `publish:${contractID}` queues)
      //   3. (In reset) Processing of any action (waiting on all the contract
      //      queues), including their side-effects (the `${contractID}` queues)
      //   4. (In reset handler) Outgoing actions from side-effects (again, in
      //      the `encrypted-action` queue)
      await sbp('okTurtles.eventQueue/queueEvent', 'encrypted-action', () => {})
      // reset will wait until we have processed any remaining actions
      await sbp('chelonia/reset', async () => {
        // some of the actions that reset waited for might have side-effects
        // that send actions
        // we wait for those as well (the duplication in this case is
        // intended) -- see 4. above
        // The intent of this is to wait for all the current actions to be
        // sent and then wait until any actions that are a side-effect are sent
        // TODO: We might not need this second await and 1-3 could be fine (i.e.,
        // we could avoid waiting on these 2nd layer of actions)
        await sbp('okTurtles.eventQueue/queueEvent', 'encrypted-action', () => {})

        // NOTE: wait for all the pending UNREAD_MESSAGES_QUEUE invocations to be finished
        await sbp('okTurtles.eventQueue/queueEvent', UNREAD_MESSAGES_QUEUE, () => {})

        // See comment below for 'gi.db/settings/delete'
        await sbp('state/vuex/save')

        // If there is a state encryption key in the app settings, remove it
        const encryptionParams = state.loggedIn?.encryptionParams
        if (encryptionParams) {
          await sbp('gi.db/settings/deleteStateEncryptionKey', encryptionParams)
        }
        await sbp('gi.db/settings/save', SETTING_CURRENT_USER, null)
      }).then(() => {
        console.info('successfully logged out')
      })
    } catch (e) {
      console.error(`${e.name} during logout: ${e.message}`, e)
    }
    // Clear the file cache when logging out to preserve privacy
    sbp('gi.db/filesCache/clear').catch((e) => { console.error('Error clearing file cache', e) })
    sbp('state/vuex/reset')
    sbp('okTurtles.events/emit', LOGOUT)
    sbp('appLogs/pauseCapture', { wipeOut: true }) // clear stored logs to prevent someone else accessing sensitve data
  },
  'gi.actions/identity/addJoinDirectMessageKey': async (contractID, foreignContractID, keyName) => {
    const keyId = sbp('chelonia/contract/currentKeyIdByName', foreignContractID, keyName)
    const CEKid = sbp('chelonia/contract/currentKeyIdByName', contractID, 'cek')

    const rootState = sbp('state/vuex/state')
    const foreignContractState = rootState[foreignContractID]

    const existingForeignKeys = sbp('chelonia/contract/foreignKeysByContractID', contractID, foreignContractID)

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
    await Promise.all(Object.keys(state.groups || {}).filter(groupID => !!rootState.contracts[groupID]).map(groupID => {
      const CEKid = findKeyIdByName(rootState[groupID], 'cek')
      const CSKid = findKeyIdByName(rootState[groupID], 'csk')

      if (!CEKid || !CSKid) {
        console.warn(`Unable to share rotated keys for ${contractID} with ${groupID}: Missing CEK or CSK`)
        // We intentionally don't throw here to be able to share keys with the
        // remaining groups
        return Promise.resolve()
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
        signingKeyId: sbp('chelonia/contract/suitableSigningKey', partnerIDs[index], [GIMessage.OP_ACTION_ENCRYPTED], ['sig'], undefined, ['gi.contracts/identity/joinDirectMessage']),
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
    const rootGetters = sbp('state/vuex/getters')

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
        contractID: rootGetters.ourIdentityContractId,
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
    const rootGetters = sbp('state/vuex/getters')
    const { identityContractID } = sbp('state/vuex/state').loggedIn
    const { shouldDeleteFile, shouldDeleteToken, throwIfMissingToken } = option
    let deleteResult, toDelete

    if (shouldDeleteFile) {
      const credentials = Object.fromEntries(manifestCids.map(cid => {
        // It could be that the file was already deleted, if we no longer have
        // a delete token. In this case, omit those CIDs.
        if (!throwIfMissingToken && shouldDeleteToken && !rootGetters.currentIdentityState.fileDeleteTokens[cid]) {
          console.info('[gi.actions/identity/removeFiles] Skipping file as token is missing', cid)
          return [cid, null]
        };
        const credential = shouldDeleteToken
          ? { token: rootGetters.currentIdentityState.fileDeleteTokens[cid] }
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
  'gi.actions/identity/fetchChatRoomUnreadMessages': async () => {
    const { ourIdentityContractId } = sbp('state/vuex/getters')
    return (await sbp('chelonia/kv/get', ourIdentityContractId, KV_KEYS.UNREAD_MESSAGES))?.data || {}
  },
  'gi.actions/identity/saveChatRoomUnreadMessages': ({ contractID, data, onconflict }: {
    contractID: string, data: Object, onconflict?: Function
  }) => {
    const { ourIdentityContractId } = sbp('state/vuex/getters')

    return sbp('chelonia/kv/set', ourIdentityContractId, KV_KEYS.UNREAD_MESSAGES, data, {
      encryptionKeyId: sbp('chelonia/contract/currentKeyIdByName', ourIdentityContractId, 'cek'),
      signingKeyId: sbp('chelonia/contract/currentKeyIdByName', ourIdentityContractId, 'csk'),
      onconflict
    })
  },
  'gi.actions/identity/loadChatRoomUnreadMessages': () => {
    return sbp('okTurtles.eventQueue/queueEvent', UNREAD_MESSAGES_QUEUE, async () => {
      const currentChatRoomUnreadMessages = await sbp('gi.actions/identity/fetchChatRoomUnreadMessages')
      sbp('state/vuex/commit', 'setUnreadMessages', currentChatRoomUnreadMessages)
    })
  },
  'gi.actions/identity/initChatRoomUnreadMessages': ({ contractID, messageHash, createdHeight }: {
    contractID: string, messageHash: string, createdHeight: number
  }) => {
    return sbp('okTurtles.eventQueue/queueEvent', UNREAD_MESSAGES_QUEUE, async () => {
      const fnInitUnreadMessages = async (cID) => {
        const currentData = await sbp('gi.actions/identity/fetchChatRoomUnreadMessages')

        if (!currentData[cID]) {
          return {
            ...currentData,
            [cID]: {
              readUntil: { messageHash, createdHeight },
              unreadMessages: []
            }
          }
        }
        return null
      }

      const data = await fnInitUnreadMessages(contractID)
      if (data) {
        await sbp('gi.actions/identity/saveChatRoomUnreadMessages', { contractID, data, onconflict: fnInitUnreadMessages })
      }
    })
  },
  'gi.actions/identity/setChatRoomReadUntil': ({ contractID, messageHash, createdHeight }: {
    contractID: string, messageHash: string, createdHeight: number
  }) => {
    return sbp('okTurtles.eventQueue/queueEvent', UNREAD_MESSAGES_QUEUE, async () => {
      const fnSetReadUntil = async (cID) => {
        const currentData = await sbp('gi.actions/identity/fetchChatRoomUnreadMessages')

        if (currentData[cID]?.readUntil.createdHeight < createdHeight) {
          const { unreadMessages } = currentData[cID]
          return {
            ...currentData,
            [cID]: {
              readUntil: { messageHash, createdHeight },
              unreadMessages: unreadMessages.filter(msg => msg.createdHeight > createdHeight)
            }
          }
        }
        return null
      }

      const data = await fnSetReadUntil(contractID)
      if (data) {
        await sbp('gi.actions/identity/saveChatRoomUnreadMessages', { contractID, data, onconflict: fnSetReadUntil })
      }
    })
  },
  'gi.actions/identity/addChatRoomUnreadMessage': ({ contractID, messageHash, createdHeight }: {
    contractID: string, messageHash: string, createdHeight: number
  }) => {
    return sbp('okTurtles.eventQueue/queueEvent', UNREAD_MESSAGES_QUEUE, async () => {
      const fnAddUnreadMessage = async (cID) => {
        const currentData = await sbp('gi.actions/identity/fetchChatRoomUnreadMessages')

        if (currentData[cID]?.readUntil.createdHeight < createdHeight) {
          const index = currentData[cID].unreadMessages.findIndex(msg => msg.messageHash === messageHash)
          if (index === -1) {
            currentData[cID].unreadMessages.push({ messageHash, createdHeight })
            return currentData
          }
        }
        return null
      }

      const data = await fnAddUnreadMessage(contractID)
      if (data) {
        await sbp('gi.actions/identity/saveChatRoomUnreadMessages', { contractID, data, onconflict: fnAddUnreadMessage })
      }
    })
  },
  'gi.actions/identity/removeChatRoomUnreadMessage': ({ contractID, messageHash }: {
    contractID: string, messageHash: string
  }) => {
    return sbp('okTurtles.eventQueue/queueEvent', UNREAD_MESSAGES_QUEUE, async () => {
      const fnRemoveUnreadMessage = async (cID) => {
        const currentData = await sbp('gi.actions/identity/fetchChatRoomUnreadMessages')

        const index = currentData[cID]?.unreadMessages.findIndex(msg => msg.messageHash === messageHash)
        // NOTE: index could be undefined if unreadMessages is not initialized
        if (Number.isInteger(index) && index >= 0) {
          currentData[cID].unreadMessages.splice(index, 1)
          return currentData
        }
        return null
      }

      const data = await fnRemoveUnreadMessage(contractID)
      if (data) {
        await sbp('gi.actions/identity/saveChatRoomUnreadMessages', { contractID, data, onconflict: fnRemoveUnreadMessage })
      }
    })
  },
  'gi.actions/identity/deleteChatRoomUnreadMessages': ({ contractID }: { contractID: string }) => {
    return sbp('okTurtles.eventQueue/queueEvent', UNREAD_MESSAGES_QUEUE, async () => {
      const fnDeleteUnreadMessages = async (cID) => {
        const currentData = await sbp('gi.actions/identity/fetchChatRoomUnreadMessages')
        if (currentData[cID]) {
          delete currentData[cID]
          return currentData
        }
        return null
      }

      const data = await fnDeleteUnreadMessages(contractID)
      if (data) {
        await sbp('gi.actions/identity/saveChatRoomUnreadMessages', { contractID, data, onconflict: fnDeleteUnreadMessages })
      }
    })
  },
  ...encryptedAction('gi.actions/identity/saveFileDeleteToken', L('Failed to save delete tokens for the attachments.')),
  ...encryptedAction('gi.actions/identity/removeFileDeleteToken', L('Failed to remove delete tokens for the attachments.'))
}): string[])
