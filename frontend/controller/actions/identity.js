'use strict'

import { GIErrorUIRuntimeError, L, LError } from '@common/common.js'
import {
  CHATROOM_PRIVACY_LEVEL,
  CHATROOM_TYPES,
  PROFILE_STATUS
} from '@model/contracts/shared/constants.js'
import { difference, omit, pickWhere, uniq } from '@model/contracts/shared/giLodash.js'
import sbp from '@sbp/sbp'
import { imageUpload } from '@utils/image.js'
import { SETTING_CURRENT_USER } from '~/frontend/model/database.js'
import { LOGIN, LOGIN_ERROR, LOGOUT } from '~/frontend/utils/events.js'
import { GIMessage } from '~/shared/domains/chelonia/GIMessage.js'
import { boxKeyPair, buildRegisterSaltRequest, computeCAndHc, decryptContractSalt, hash, hashPassword, randomNonce } from '~/shared/zkpp.js'
import { findKeyIdByName } from '~/shared/domains/chelonia/utils.js'
import { encryptedOutgoingData, encryptedOutgoingDataWithRawKey } from '~/shared/domains/chelonia/encryptedData.js'
// Using relative path to crypto.js instead of ~-path to workaround some esbuild bug
import { CURVE25519XSALSA20POLY1305, EDWARDS25519SHA512BATCH, deriveKeyFromPassword, keyId, keygen, serializeKey } from '../../../shared/domains/chelonia/crypto.js'
import type { Key } from '../../../shared/domains/chelonia/crypto.js'
import { handleFetchResult } from '../utils/misc.js'
import { encryptedAction } from './utils.js'

function generatedLoginState () {
  const { contracts } = sbp('state/vuex/state')
  return {
    groupIds: Object.keys(pickWhere(contracts, ({ type }) => {
      return type === 'gi.contracts/group'
    }))
  }
}

function diffLoginStates (s1: ?Object, s2: ?Object) {
  if (typeof s1 !== 'object' || typeof s2 !== 'object') return true
  const [g1, g2] = [(s1: Object).groupIds, (s2: Object).groupIds]
  if (!g1 || !g2) return true
  return (g1.length > g2.length ? difference(g1, g2) : difference(g2, g1)).length > 0
}

export default (sbp('sbp/selectors/register', {
  'gi.actions/identity/retrieveSalt': async (username: string, passwordFn: () => string) => {
    const r = randomNonce()
    const b = hash(r)
    const authHash = await fetch(`${sbp('okTurtles.data/get', 'API_URL')}/zkpp/user=${encodeURIComponent(username)}/auth_hash?b=${encodeURIComponent(b)}`)
      .then(handleFetchResult('json'))

    const { authSalt, s, sig } = authHash

    const h = await hashPassword(passwordFn(), authSalt)

    const [c, hc] = computeCAndHc(r, s, h)

    const contractHash = await fetch(`${sbp('okTurtles.data/get', 'API_URL')}/zkpp/user=${encodeURIComponent(username)}/contract_hash?${(new URLSearchParams({
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

    if (picture) {
      try {
        finalPicture = await imageUpload(picture)
      } catch (e) {
        console.error('actions/identity.js picture upload error:', e)
        throw new GIErrorUIRuntimeError(L('Failed to upload the profile picture. {codeError}', { codeError: e.message }))
      }
    }
    // proceed with creation
    const keyPair = boxKeyPair()
    const r = Buffer.from(keyPair.publicKey).toString('base64').replace(/\//g, '_').replace(/\+/g, '-')
    const b = hash(r)
    // TODO: use the contractID instead, and move this code down below the registration
    const registrationRes = await fetch(`${sbp('okTurtles.data/get', 'API_URL')}/zkpp/register/user=${encodeURIComponent(username)}`, {
      method: 'POST',
      headers: {
        'content-type': 'application/x-www-form-urlencoded'
      },
      body: `b=${encodeURIComponent(b)}`
    })
      .then(handleFetchResult('json'))

    const { p, s, sig } = registrationRes

    const [contractSalt, Eh] = await buildRegisterSaltRequest(p, keyPair.secretKey, password)
    // TODO: use the contractID instead, and move this code down below the registration
    const res = await fetch(`${sbp('okTurtles.data/get', 'API_URL')}/zkpp/register/user=${encodeURIComponent(username)}`, {
      method: 'POST',
      headers: {
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

    // Create the necessary keys to initialise the contract
    const IPK = await deriveKeyFromPassword(EDWARDS25519SHA512BATCH, password, contractSalt)
    const IEK = await deriveKeyFromPassword(CURVE25519XSALSA20POLY1305, password, contractSalt)
    const CSK = keygen(EDWARDS25519SHA512BATCH)
    const CEK = keygen(CURVE25519XSALSA20POLY1305)
    const PEK = keygen(CURVE25519XSALSA20POLY1305)

    // Key IDs
    const IPKid = keyId(IPK)
    const IEKid = keyId(IEK)
    const CSKid = keyId(CSK)
    const CEKid = keyId(CEK)
    const PEKid = keyId(PEK)

    // Public keys to be stored in the contract
    const IPKp = serializeKey(IPK, false)
    const IEKp = serializeKey(IEK, false)
    const CSKp = serializeKey(CSK, false)
    const CEKp = serializeKey(CEK, false)
    const PEKp = serializeKey(PEK, false)

    // Secret keys to be stored encrypted in the contract
    const CSKs = encryptedOutgoingDataWithRawKey(IEK, serializeKey(CSK, true))
    const CEKs = encryptedOutgoingDataWithRawKey(IEK, serializeKey(CEK, true))
    const PEKs = encryptedOutgoingDataWithRawKey(CEK, serializeKey(PEK, true))

    // Before creating the contract, put all keys into transient store
    sbp('chelonia/storeSecretKeys',
      () => [IPK, IEK, CEK, CSK, PEK].map(key => ({ key, transient: true }))
    )

    let userID
    // next create the identity contract itself
    try {
      const user = await sbp('chelonia/out/registerContract', {
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
          }
        ],
        data: {
          attributes: { username, email, picture: finalPicture }
        }
      })

      userID = user.contractID()

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
      await sbp('namespace/register', username, userID)
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
  'gi.actions/identity/saveOurLoginState': function () {
    const getters = sbp('state/vuex/getters')
    const contractID = getters.ourIdentityContractId
    const ourLoginState = generatedLoginState()
    const contractLoginState = getters.loginState
    if (contractID && diffLoginStates(ourLoginState, contractLoginState)) {
      return sbp('gi.actions/identity/setLoginState', {
        contractID, data: ourLoginState
      })
    }
  },
  'gi.actions/identity/updateLoginStateUponLogin': async function () {
    const getters = sbp('state/vuex/getters')
    const state = sbp('state/vuex/state')
    const ourLoginState = generatedLoginState()
    const contractLoginState = getters.loginState
    try {
      if (!contractLoginState) {
        console.info('no login state detected in identity contract, will set it')
        await sbp('gi.actions/identity/saveOurLoginState')
      } else if (diffLoginStates(ourLoginState, contractLoginState)) {
        // we need to update ourselves to it
        // mainly we are only interested if the contractLoginState contains groupIds
        // that we don't have, and if so, join those groups
        const groupsJoined = difference(contractLoginState.groupIds, ourLoginState.groupIds)
        console.info('synchronizing login state:', { groupsJoined })
        for (const contractID of groupsJoined) {
          try {
            await sbp('gi.actions/group/join', { contractID })
          } catch (e) {
            console.error(`updateLoginStateUponLogin: ${e.name} attempting to join group ${contractID}`, e)
            if (state.contracts[contractID] || state[contractID]) {
              console.warn(`updateLoginStateUponLogin: removing ${contractID} b/c of failed join`)
              try {
                await sbp('chelonia/contract/remove', contractID)
              } catch (e2) {
                console.error(`failed to remove ${contractID} too!`, e2)
              }
            }
          }
        }
      }
      // NOTE: should sync all the identity contracts which are not part of same group
      // but from the direct messages invited by another
      const chatRoomUsers = uniq(Object.keys(
        pickWhere(state.contracts, ({ type }) => type === 'gi.contracts/chatroom')
      ).map(cID => Object.keys(state[cID].users || {})).flat())
      const additionalIdentityContractIDs = await Promise.all(chatRoomUsers.filter(username => {
        return getters.ourUsername !== username && !getters.ourContacts.includes(username)
      }).map(username => sbp('namespace/lookup', username)))
      await sbp('chelonia/contract/sync', additionalIdentityContractIDs)

      // NOTE: users could notice that they leave the group by someone else when they log in
      if (!state.currentGroupId) {
        const { contracts } = state
        // grab the groupID of any group that we've successfully finished joining
        const gId = Object.keys(contracts)
          .filter(cID => contracts[cID].type === 'gi.contracts/group')
          .sort((cID1, cID2) => state[cID1].profiles?.[state.loggedIn.username] ? -1 : 1)[0]
        if (gId) {
          sbp('gi.actions/group/switch', gId)
          const router = sbp('controller/router')
          // redirect us to the dashboard upon login if there's nothing else going on, no modals up, etc.
          // only update the URL if it's empty and we're stuck at the homepage, as can sometimes happen
          if (router.currentRoute.path === '/' && Object.keys(router.currentRoute.query).length === 0) {
            router.push({ path: '/dashboard' }).catch(console.warn)
          }
        }
      }
    } catch (e) {
      console.error(`updateLoginState: ${e.name}: '${e.message}'`, e)
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

    try {
      sbp('appLogs/startCapture', identityContractID)
      const { encryptionParams, value: state } = await sbp('gi.db/settings/loadEncrypted', identityContractID, password && ((stateEncryptionKeyId, salt) => {
        return deriveKeyFromPassword(CURVE25519XSALSA20POLY1305, password, salt + stateEncryptionKeyId)
      }))

      const contractIDs = []
      const groupsToRejoin = []
      // login can be called when no settings are saved (e.g. from Signup.vue)
      if (state) {
        // The retrieved local data might need to be completed in case it was originally saved
        // under an older version of the app where fewer/other Vuex modules were implemented.
        sbp('state/vuex/postUpgradeVerification', state)
        sbp('state/vuex/replace', state)
        sbp('chelonia/pubsub/update') // resubscribe to contracts since we replaced the state
        contractIDs.push(...Object.keys(state.contracts))

        // Some of the group contracts in the state may not have completed the
        // two-step join process (i.e., an OP_KEY_SHARE had not been received
        // after joining the last time the state was saved)
        // The following identifies those groups and saves them to groupsToRejoin
        groupsToRejoin.push(...contractIDs.filter((contractID) => {
          return (
            // (1) We're looking for group contracts
            state.contracts[contractID].type === 'gi.contracts/group' &&
            // (2) That potentially haven't been joined by us
            //     (in which case state.profiles?.[username] will be undefined)
            !state.profiles?.[username]
          )
        }))
      }

      await sbp('gi.db/settings/save', SETTING_CURRENT_USER, identityContractID)

      const loginAttributes = { identityContractID, encryptionParams, username }

      // If username was not provided, retrieve it from the state
      // TODO: This is temporary until username is no longer needed internally
      // in contracts
      if (!loginAttributes.username) {
        loginAttributes.username = Object.entries(state.namespaceLookups)
          .find(([k, v]) => v === identityContractID)
          ?.[0]
      }

      sbp('state/vuex/commit', 'login', loginAttributes)
      await sbp('chelonia/storeSecretKeys', () => transientSecretKeys)

      // IMPORTANT: we avoid using 'await' on the syncs so that Vue.js can proceed
      //            loading the website instead of stalling out.
      // See the TODO note in startApp (main.js) for why this is not awaited
      sbp('chelonia/contract/sync', identityContractID, { force: true })
        .catch((err) => {
          sbp('okTurtles.events/emit', LOGIN_ERROR, { username, identityContractID, error: err })
          const errMessage = err?.message || String(err)
          console.error('Error during login contract sync', errMessage)

          const promptOptions = {
            heading: L('Login error'),
            question: L('Do you want to log out? Error details: {err}.', { err: err.message }),
            primaryButton: L('No'),
            secondaryButton: L('Yes')
          }

          sbp('gi.ui/prompt', promptOptions).then((result) => {
            if (!result) {
              sbp('gi.actions/identity/logout')
            }
          }).catch((e) => {
            console.error('Error at gi.ui/prompt', e)
          })

          throw new Error('Unable to sync identity contract')
        }).then(() =>
          sbp('chelonia/contract/sync', contractIDs).then(async function () {
          // contract sync might've triggered an async call to /remove, so wait before proceeding
            await sbp('chelonia/contract/wait', contractIDs)
            // similarly, since removeMember may have triggered saveOurLoginState asynchronously,
            // we must re-sync our identity contract again to ensure we don't rejoin a group we
            // were just kicked out of
            await sbp('chelonia/contract/sync', identityContractID, { force: true })
            await sbp('gi.actions/identity/updateLoginStateUponLogin')
            await sbp('gi.actions/identity/saveOurLoginState') // will only update it if it's different

            // The state above might be null, so we re-grab it
            const state = sbp('state/vuex/state')

            // Call 'gi.actions/group/join' on all groups which may need re-joining
            await Promise.all(groupsToRejoin.map(groupId => {
              return (
                // (1) Check whether the contract exists (may have been removed
                //     after sync)
                state.contracts[groupId] &&
                // (2) Check whether the join process is still incomplete
                //     This needs to be re-checked because it may have changed after
                //     sync
                state[groupId]?.profiles?.[username]?.status !== PROFILE_STATUS.ACTIVE &&
                // (3) Call join
                sbp('gi.actions/group/join', {
                  contractID: groupId,
                  contractName: 'gi.contracts/group'
                })
              )
            }))

            // update the 'lastLoggedIn' field in user's group profiles
            sbp('state/vuex/getters').groupsByName
              .map(entry => entry.contractID)
              .forEach(cId => {
                // We send this action only for groups we have fully joined (i.e.,
                // accepted an invite add added our profile)
                if (state[cId]?.profiles?.[username]?.status === PROFILE_STATUS.ACTIVE) {
                  sbp('gi.actions/group/updateLastLoggedIn', { contractID: cId }).catch((e) => console.error('Error sending updateLastLoggedIn', e))
                }
              })
          }).finally(() => {
            sbp('okTurtles.events/emit', LOGIN, { username, identityContractID })
          })
        ).catch((err) => {
          console.error('Error during contract sync upon login', err)
        })
      return identityContractID
    } catch (e) {
      console.error('gi.actions/identity/login failed!', e)
      const humanErr = L('Failed to login: {reportError}', LError(e))
      alert(humanErr)
      sbp('gi.actions/identity/logout')
      throw new GIErrorUIRuntimeError(humanErr)
    }
  },
  'gi.actions/identity/signupAndLogin': async function ({ username, email, passwordFn }) {
    const contractIDs = await sbp('gi.actions/identity/signup', { username, email, passwordFn })
    await sbp('gi.actions/identity/login', { username, passwordFn })
    return contractIDs
  },
  'gi.actions/identity/logout': async function () {
    const state = sbp('state/vuex/state')
    try {
      // wait for any pending sync operations to finish before saving
      console.info('logging out, waiting for any events to finish...')
      await sbp('chelonia/contract/wait')
      // See comment below for 'gi.db/settings/delete'
      await sbp('state/vuex/save')

      // If there is a state encryption key in the app settings, remove it
      const encryptionParams = state.loggedIn?.encryptionParams
      if (encryptionParams) {
        await sbp('gi.db/settings/deleteStateEncryptionKey', encryptionParams)
      }

      await sbp('gi.db/settings/save', SETTING_CURRENT_USER, null)
      await sbp('chelonia/contract/remove', Object.keys(state.contracts))
      sbp('chelonia/clearTransientSecretKeys')
      console.info('successfully logged out')
    } catch (e) {
      console.error(`${e.name} during logout: ${e.message}`, e)
    }
    sbp('state/vuex/reset')
    sbp('okTurtles.events/emit', LOGOUT)
    sbp('appLogs/pauseCapture', { wipeOut: true }) // clear stored logs to prevent someone else accessing sensitve data
  },
  'gi.actions/identity/shareNewPEK': (contractID: string, newKeys) => {
    const rootState = sbp('state/vuex/state')
    const state = rootState[contractID]

    // TODO: Also share PEK with DMs
    return Promise.all((state.loginState?.groupIds || []).filter(groupID => !!rootState.contracts[groupID]).map(groupID => {
      const groupState = rootState[groupID]
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
        data: encryptedOutgoingData(groupState, CEKid, {
          contractID: groupID,
          // $FlowFixMe
          keys: Object.values(newKeys).map(([, newKey, newId]: [any, Key, string]) => ({
            id: newId,
            meta: {
              private: {
                content: encryptedOutgoingData(groupState, CEKid, serializeKey(newKey, true))
              }
            }
          }))
        }),
        signingKeyId: CSKid
      })
    })).then(() => undefined)
  },
  ...encryptedAction('gi.actions/identity/setAttributes', L('Failed to set profile attributes.'), undefined, 'pek'),
  ...encryptedAction('gi.actions/identity/updateSettings', L('Failed to update profile settings.')),
  ...encryptedAction('gi.actions/identity/setLoginState', L('Failed to set login state.')),
  ...encryptedAction('gi.actions/identity/createDirectMessage', L('Failed to create a new direct message channel.'), async function (sendMessage, params) {
    const rootState = sbp('state/vuex/state')
    const rootGetters = sbp('state/vuex/getters')
    const partnerProfiles = params.data.usernames.map(username => rootGetters.ourContactProfiles[username])
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
    })

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
      data: { username: rootState.loggedIn.username }
    })

    for (const profile of partnerProfiles) {
      await sbp('gi.actions/chatroom/join', {
        ...omit(params, ['options', 'contractID', 'data', 'hooks']),
        contractID: message.contractID(),
        data: { username: profile.username }
      })
    }

    await sendMessage({
      ...omit(params, ['options', 'data', 'action', 'hooks']),
      data: {
        groupContractID: currentGroupId,
        contractID: message.contractID()
      }
    })

    for (const [index, profile] of partnerProfiles.entries()) {
      const hooks = index < partnerProfiles.length - 1 ? undefined : { prepublish: null, postpublish: params.hooks?.postpublish }

      // Share the keys to the newly created chatroom with partners
      // TODO: We need to handle multiple groups and the possibility of not
      // having any groups in common
      await sbp('gi.actions/out/shareVolatileKeys', {
        contractID: profile.contractID,
        contractName: 'gi.contracts/identity',
        subjectContractID: message.contractID(),
        keyIds: '*'
      })

      await sbp('gi.actions/identity/joinDirectMessage', {
        ...omit(params, ['options', 'contractID', 'data', 'hooks']),
        contractID: profile.contractID,
        data: {
          groupContractID: currentGroupId,
          // TODO: We need to handle multiple groups and the possibility of not
          // having any groups in common
          contractID: message.contractID()
        },
        // For now, we assume that we're messaging someone which whom we
        // share a group
        signingKeyId: sbp('chelonia/contract/suitableSigningKey', profile.contractID, [GIMessage.OP_ACTION_ENCRYPTED], ['sig'], undefined, ['gi.contracts/identity/joinDirectMessage']),
        innerSigningContractID: rootState.currentGroupId,
        hooks
      })
    }
  }),
  ...encryptedAction('gi.actions/identity/joinDirectMessage', L('Failed to join a direct message.')),
  ...encryptedAction('gi.actions/identity/setDirectMessageVisibility', L('Failed to set direct message visibility.'))
}): string[])
