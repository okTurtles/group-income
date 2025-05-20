'use strict'

import { GIErrorUIRuntimeError, L, LError, LTags } from '@common/common.js'
import { cloneDeep } from 'turtledash'
import sbp from '@sbp/sbp'
import Vue from 'vue'
import { LOGIN, LOGIN_COMPLETE, LOGIN_ERROR, NEW_PREFERENCES, NEW_UNREAD_MESSAGES } from '~/frontend/utils/events.js'
import { Secret } from '~/shared/domains/chelonia/Secret.js'
import { EVENT_HANDLED } from '~/shared/domains/chelonia/events.js'
import { boxKeyPair, buildRegisterSaltRequest, buildUpdateSaltRequestEc, computeCAndHc, decryptContractSalt, hash, hashPassword, randomNonce } from '~/shared/zkpp.js'
import { SETTING_CHELONIA_STATE } from '@model/database.js'
import { CURVE25519XSALSA20POLY1305, EDWARDS25519SHA512BATCH, deriveKeyFromPassword, serializeKey } from '@chelonia/crypto'
import { handleFetchResult } from '../utils/misc.js'

const loadState = async (identityContractID: string, password: ?string) => {
  if (password) {
    const stateKeyEncryptionKeyFn = (stateEncryptionKeyId, salt) => {
      return deriveKeyFromPassword(CURVE25519XSALSA20POLY1305, password, salt + stateEncryptionKeyId)
    }

    const { encryptionParams, value: state } = await sbp('gi.db/settings/loadEncrypted', identityContractID, stateKeyEncryptionKeyFn)

    if (state) {
      // If state contains a saved Chelonia state, extract it.
      // The saved Chelonia state will be used to restore Chelonia on this
      // new session.
      const cheloniaState = state.cheloniaState
      delete state.cheloniaState

      return { encryptionParams, state, cheloniaState }
    } else {
      // There's no state to restore
      return { encryptionParams, state: null, cheloniaState: null }
    }
  } else {
    const state = await sbp('gi.db/settings/load', identityContractID)

    // cheloniaState is only stored in settings when logging in with a password
    // If there's an active session, then cheloniaState is stored and
    // managed separately
    return { encryptionParams: null, state, cheloniaState: null }
  }
}

sbp('okTurtles.events/on', LOGIN, async ({ identityContractID, encryptionParams, state }) => {
  // This function restores the state after a successful login. It's complex
  // because it deals with _three_ different states.
  // * `state` (input parameter): (optional). This is the _saved_ Vuex state
  //   that we'll use to replace the current Vuex state (`vuexState`). Passed in
  //   when there is an active session with state.
  // * `vuexState`: This is the root Vuex state as it exists. This is accessed
  //   using the `state/vuex/state` selector. When `state` is provided, it'll
  //   be replaced by `state`. Otherwise, it'll not be replaced.
  // * `cheloniaState`: This is the Chelonia root state, retrieved using the
  //   `chelonia/rootState` selector. This will be used to augment the current
  //   or new Vuex state: any Chelonia-specific state will be set directly from
  //   `cheloniaState` and any exisiting contract state in `state` or `vuexState`
  //   will be discarded.
  await sbp('okTurtles.eventQueue/queueEvent', EVENT_HANDLED, async () => {
    try {
      const vuexState = sbp('state/vuex/state')
      if (vuexState.loggedIn && vuexState.loggedIn.identityContractID !== identityContractID) {
      // This shouldn't happen. It means that we received a LOGIN event but
      // there's an active session for a different user. If this happens, it
      // means that there's buggy login logic that should be reported and fixed
        console.error('Received login event during active session', { receivedIdentityContractID: identityContractID, existingIdentityContractID: vuexState.loggedIn.identityContractID })
        throw new Error('Received login event but there already is an active session')
      }
      const cheloniaState = cloneDeep(await sbp('chelonia/rootState'))
      // If `state` is set, process it and replace Vuex state with it
      if (state) {
      // Exclude contracts from the state
        if (state.contracts) {
          Object.keys(state.contracts).forEach(k => {
          // Vue.delete not needed as the entire object will replace the state
            delete state[k]
          })
        }
        // Augment state with Chelonia state
        Object.keys(cheloniaState.contracts).forEach(k => {
          if (cheloniaState[k]) {
          // Vue.set not needed as the entire object will replace the state
            state[k] = cheloniaState[k]
          }
        })
        state.contracts = cheloniaState.contracts
        if (cheloniaState.namespaceLookups) {
          state.namespaceLookups = cheloniaState.namespaceLookups
        }
        // End exclude contracts
        sbp('state/vuex/postUpgradeVerification', state)
        sbp('state/vuex/replace', state)
      } else {
      // Else, if `state` was not given, just sync add contracts from Chelonia
      // to the current Vuex state
        const state = vuexState
        // Exclude contracts from the state
        if (state.contracts) {
          Object.keys(state.contracts).forEach(k => {
            Vue.delete(state, k)
          })
        }
        Object.keys(cheloniaState.contracts).forEach(k => {
          if (cheloniaState[k]) {
            Vue.set(state, k, cheloniaState[k])
          }
        })
        Vue.set(state, 'contracts', cheloniaState.contracts)
        if (cheloniaState.namespaceLookups) {
          Vue.set(state, 'namespaceLookups', cheloniaState.namespaceLookups)
        }
        // End exclude contracts
        sbp('state/vuex/postUpgradeVerification', state)
      }

      if (encryptionParams) {
        sbp('state/vuex/commit', 'login', { identityContractID, encryptionParams })
      }

      // NOTE: users could notice that they leave the group by someone
      // else when they log in
      const currentState = sbp('state/vuex/state')
      if (!currentState.currentGroupId) {
        const gId = Object.keys(currentState.contracts)
          .find(cID => currentState[identityContractID].groups[cID] && !currentState[identityContractID].groups[cID].hasLeft)

        if (gId) {
          sbp('gi.app/group/switch', gId)
        }
      }

      // Whenever there's an active session, the encrypted save state should be
      // removed, as it is only used for recovering the state when logging in
      sbp('gi.db/settings/deleteEncrypted', identityContractID).catch(e => {
        console.error('Error deleting encrypted settings after login')
      })

      /* Commented out as persistentActions are not being used
      // TODO: [SW] It may make more sense to load persistent actions in
      // actions in the SW instead of on each tab
      const databaseKey = `chelonia/persistentActions/${identityContractID}`
      sbp('chelonia.persistentActions/configure', { databaseKey })
      await sbp('chelonia.persistentActions/load')
      */

      sbp('okTurtles.events/emit', LOGIN_COMPLETE, { identityContractID })
    } catch (e) {
      sbp('okTurtles.events/emit', LOGIN_ERROR, { identityContractID, error: e })
    }
  })
})

// handle incoming identity-related events that are sent from the service worker
sbp('okTurtles.events/on', NEW_UNREAD_MESSAGES, (currentChatRoomUnreadMessages) => {
  sbp('state/vuex/commit', 'setUnreadMessages', currentChatRoomUnreadMessages)
})

sbp('okTurtles.events/on', NEW_PREFERENCES, (preferences) => {
  sbp('state/vuex/commit', 'setPreferences', preferences)
})

/* Commented out as persistentActions are not being used
sbp('okTurtles.events/on', LOGOUT, (a) => {
  // TODO: [SW] It may make more sense to load persistent actions in
  // actions in the SW instead of on each tab
  sbp('chelonia.persistentActions/unload')
})
*/

export default (sbp('sbp/selectors/register', {
  'gi.app/identity/retrieveSalt': async (identityContractID: string, password: Secret<string>): Promise<[string, ?string]> => {
    const r = randomNonce()
    const b = hash(r)
    const authHash = await fetch(`${sbp('okTurtles.data/get', 'API_URL')}/zkpp/${encodeURIComponent(identityContractID)}/auth_hash?b=${encodeURIComponent(b)}`)
      .then(handleFetchResult('json'))

    const { authSalt, s, sig } = authHash

    const h = await hashPassword(password.valueOf(), authSalt)

    const [c, hc] = computeCAndHc(r, s, h)

    const contractHash = await fetch(`${sbp('okTurtles.data/get', 'API_URL')}/zkpp/${encodeURIComponent(identityContractID)}/contract_hash?${(new URLSearchParams({
      'r': r,
      's': s,
      'sig': sig,
      'hc': Buffer.from(hc).toString('base64').replace(/\//g, '_').replace(/\+/g, '-').replace(/=*$/, '')
    })).toString()}`).then(handleFetchResult('text'))

    // [contractSalt, cid]
    return JSON.parse(decryptContractSalt(c, contractHash))
  },
  'gi.app/identity/updateSaltRequest': async (identityContractID: string, oldPassword: Secret<string>, newPassword: Secret<string>) => {
    const r = randomNonce()
    const b = hash(r)
    const authHash = await fetch(`${sbp('okTurtles.data/get', 'API_URL')}/zkpp/${encodeURIComponent(identityContractID)}/auth_hash?b=${encodeURIComponent(b)}`)
      .then(handleFetchResult('json'))

    const { authSalt, s, sig } = authHash

    const h = await hashPassword(oldPassword.valueOf(), authSalt)

    const [c, hc] = computeCAndHc(r, s, h)

    const [contractSalt, encryptedArgs] = await buildUpdateSaltRequestEc(newPassword.valueOf(), c)

    const response = await fetch(`${sbp('okTurtles.data/get', 'API_URL')}/zkpp/${encodeURIComponent(identityContractID)}/updatePasswordHash`, {
      method: 'POST',
      headers: {
        'content-type': 'application/x-www-form-urlencoded'
      },
      body:
        `${(new URLSearchParams({
          'r': r,
          's': s,
          'sig': sig,
          'hc': Buffer.from(hc).toString('base64').replace(/\//g, '_').replace(/\+/g, '-').replace(/=*$/, ''),
          'Ea': encryptedArgs
        })).toString()}`
    }).then(handleFetchResult('text'))

    const [oldContractSalt, updateToken] = JSON.parse(decryptContractSalt(c, response))

    return [contractSalt, oldContractSalt, updateToken]
  },
  'gi.app/identity/create': async function ({
    data: { username, email, password, picture },
    publishOptions
  }) {
    password = password.valueOf()

    // proceed with creation
    const keyPair = boxKeyPair()
    const r = Buffer.from(keyPair.publicKey).toString('base64').replace(/\//g, '_').replace(/\+/g, '-')
    const b = hash(r)
    const registrationRes = await fetch(`${sbp('okTurtles.data/get', 'API_URL')}/zkpp/register/${encodeURIComponent(username)}`, {
      method: 'POST',
      headers: {
        'content-type': 'application/x-www-form-urlencoded'
      },
      body: `b=${encodeURIComponent(b)}`
    })
      .then(handleFetchResult('json'))

    const { p, s, sig } = registrationRes

    const [contractSalt, Eh, encryptionKey] = await buildRegisterSaltRequest(p, keyPair.secretKey, password)

    const saltRegistrationTokenReq = await fetch(`${sbp('okTurtles.data/get', 'API_URL')}/zkpp/register/${encodeURIComponent(username)}`, {
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

    if (!saltRegistrationTokenReq.ok) {
      throw new Error('Unable to register hash')
    }

    const encryptedToken = await saltRegistrationTokenReq.text()
    const token = decryptContractSalt(encryptionKey, encryptedToken)

    // Create the necessary keys to initialise the contract
    const IPK = await deriveKeyFromPassword(EDWARDS25519SHA512BATCH, password, contractSalt)
    const IEK = await deriveKeyFromPassword(CURVE25519XSALSA20POLY1305, password, contractSalt)

    // next create the identity contract itself
    try {
      const userID = await sbp('gi.actions/identity/create', {
        IPK: new Secret(serializeKey(IPK, true)),
        IEK: new Secret(serializeKey(IEK, true)),
        publishOptions,
        username,
        email,
        picture,
        token: new Secret(token)
      })

      return userID
    } catch (e) {
      console.error('gi.app/identity/create failed!', e)
      throw new GIErrorUIRuntimeError(L('Failed to create user identity: {reportError}', LError(e)))
    }
  },
  'gi.app/identity/signup': async function ({ username, email, password }, publishOptions) {
    try {
      const randomAvatar = sbp('gi.utils/avatar/create')
      const userID = await sbp('gi.app/identity/create', {
        data: {
          username,
          email,
          password,
          picture: randomAvatar
        },
        publishOptions
      })
      return userID
    } catch (e) {
      console.error('gi.app/identity/signup failed!', e)
      await sbp('gi.app/identity/logout') // TODO: should this be here?
      const message = LError(e)
      if (e.name === 'GIErrorUIRuntimeError') {
        // 'gi.app/identity/create' also sets reportError
        message.reportError = e.message
      }
      throw new GIErrorUIRuntimeError(L('Failed to signup: {reportError}', message))
    }
  },
  'gi.app/identity/login': function ({ username, password: wpassword, identityContractID }: {
    username: ?string, password: ?Secret<string>, identityContractID: string
  }) {
    // This wrapper ensures that there is at most one login flow action executed
    // at any given time. Because of the async work done when logging in and out,
    // it could happen that, e.g., `gi.actions/identity/login` is called before
    // a previous call to `gi.actions/identity/logout` completed (this should
    // not be allowed by the UI, and it'd require that users do things very
    // quickly, but using automation can cause this).
    // To prevent issues, the login and logout actions are wrapped an placed in
    // a queue.
    return sbp('okTurtles.eventQueue/queueEvent', 'APP-LOGIN', async () => {
      console.debug('[gi.app/identity/login] Scheduled call starting', identityContractID, username)
      if (username) {
        // We expect that in development mode the same browser may be used and
        // server data cleared often, so we skip the cache lookup for dev
        // convenience.
        const nsIdentityContractID = await sbp('namespace/lookup', username, { skipCache: process.env.CI || process.env.NODE_ENV !== 'production' })
        // If we've only been given a username, set `identityContractID` to the
        // contract ID we've just looked up
        if (!identityContractID) {
          identityContractID = nsIdentityContractID
        } else if (nsIdentityContractID !== identityContractID) {
          // However, if we _know_ what the contract ID should be (e.g., right
          // after signing up, when we've ourselves created the contract), we
          // check that the contractID we're signing in into is what we expect
          // it to be.
          console.error(new Error(`Identity contract ID mismatch during login: ${identityContractID} != ${nsIdentityContractID}`))
          throw new GIErrorUIRuntimeError(L('Identity contract ID mismatch during login'))
        }
      }

      if (!identityContractID) {
        throw new GIErrorUIRuntimeError(L('Incorrect username or password'))
      }

      const password = wpassword?.valueOf()
      const transientSecretKeys = []
      let oldKeysAnchorCid

      // If we're creating a new session, here we derive the IEK. This key (not
      // the password) will be passed to the service worker.
      if (password) {
        try {
          // Retrive the salt and the CID (hash) of the message that allows us
          // to decrypt old rotated keys, if any
          const [salt, cid] = await sbp('gi.app/identity/retrieveSalt', identityContractID, wpassword)
          const IEK = await deriveKeyFromPassword(CURVE25519XSALSA20POLY1305, password, salt)
          transientSecretKeys.push(IEK)
          oldKeysAnchorCid = cid
        } catch (e) {
          console.error('caught error calling retrieveSalt:', e)
          throw new GIErrorUIRuntimeError(L('Incorrect username or password'))
        }
      }

      try {
        await sbp('appLogs/startCapture', identityContractID)
        const { state, cheloniaState, encryptionParams } = await loadState(identityContractID, password)
        let loginCompleteHandler, loginErrorHandler

        try {
          // Since some steps now will happen asynchronously through events,
          // we set up a promise that will resolve once the login process is
          // complete
          const loginCompletePromise = new Promise((resolve, reject) => {
            const loginCompleteHandler = ({ identityContractID: id }) => {
              removeLoginErrorHandler()
              if (id === identityContractID) {
                // Before the promise resolves, we need to save the state
                // by calling 'state/vuex/save' to ensure that refreshing the page
                // results in a page with the same state.
                resolve(sbp('state/vuex/save'))
              } else {
                reject(new Error(`Identity contract ID mismatch during login: ${identityContractID} != ${id}`))
              }
            }
            const loginErrorHandler = ({ identityContractID: id, error }) => {
              removeLoginCompleteHandler()
              if (id === identityContractID) {
                reject(error)
              } else {
                reject(new Error(`Identity contract ID mismatch during login (on error): ${identityContractID} != ${id}`))
              }
            }

            const removeLoginCompleteHandler = sbp('okTurtles.events/once', LOGIN_COMPLETE, loginCompleteHandler)
            const removeLoginErrorHandler = sbp('okTurtles.events/once', LOGIN_ERROR, loginErrorHandler)
          })

          // Are we logging in and setting up a fresh session or loading an
          // existing session?
          if (password) {
            // Setting up a fresh session:
            // Send `cheloniaState` and the Vuex `state` to the action.
            // `cheloniaState` will be used to restore the Chelonia state
            // and `state` will be sent back to replace the current Vuex state
            // after login. When using a service worker, all tabs will receive
            // a new Vuex state to replace their state with.
            await sbp('gi.actions/identity/login', {
              identityContractID,
              encryptionParams,
              cheloniaState,
              state,
              transientSecretKeys: new Secret(transientSecretKeys.map(k => serializeKey(k, true))),
              oldKeysAnchorCid
            })
          } else {
            try {
              await sbp('chelonia/contract/sync', identityContractID)
            } catch (e) {
              // Since we're throwing or returning, the `await` below will not
              // be used. In either case, login won't complete after this point,
              // so errors there aren't relevant anymore.
              loginCompletePromise.catch((e) => {
                // Using `warn` level because this error is not so relevant
                // However, errors might be helpful for debugging purposes, so
                // we still log it.
                console.warn('[gi.app/identity/login] Error in login complete promise', e)
              })

              // To make it easier to test things during development, if the
              // identity contract no longer exists, we automatically log out
              // If we're in production mode, we show a prompt instead as logging
              // out could result in permanent data loss (of the local state).
              if (process.env.NODE_ENV !== 'production') {
                console.error('Error syncing identity contract, automatically logging out', identityContractID, e)
                return sbp('gi.app/identity/_private/logout', state)
              }
              throw e
            }
            // If an existing session exists, we just emit the LOGIN event
            // to set the local Vuex state and signal we're ready.
            sbp('okTurtles.events/emit', LOGIN, { identityContractID, state })
          }

          // Wait until all events have been processed before returning
          await loginCompletePromise
        } catch (e) {
          sbp('okTurtles.events/off', LOGIN_COMPLETE, loginCompleteHandler)
          sbp('okTurtles.events/off', LOGIN_ERROR, loginErrorHandler)

          const errMessage = e?.message || String(e)
          console.error('[gi.app/identity] Error during login contract sync', e)

          const forkedChain = (e && (e.name === 'ChelErrorForkedChain' || e.cause?.name === 'ChelErrorForkedChain'))
          const deleted = (e && (e.name === 'ChelErrorResourceGone' || e.cause?.name === 'ChelErrorResourceGone'))

          const promptOptions = {
            heading: L('Login error'),
            question: forkedChain
              ? L('The server\'s history for your identity contract has diverged from ours. This can happen in extremely rare circumstances due to either malicious activity or a bug. {br_}To fix this, the contract needs to be resynced, and some recent events may be missing. {br_}Would you like to log out and resync data on your next login? {br_}Error details: {err}.', { err: errMessage, ...LTags() })
              : deleted
                ? L('Your account seems to have been deleted from the server. {br_}To fix this, you need to log out and create a new account. {br_}Error details: {err}.', { err: errMessage, ...LTags() })
                : L('An error occurred while logging in. Please try logging in again. {br_}Error details: {err}.', { err: errMessage, ...LTags() }),
            primaryButton: L('Log out'),
            // secondaryButton: L('No'),
            primaryButtonStyle: 'primary', // make primary button 'filled' style
            isContentCentered: !forkedChain && !deleted
          }

          const result = await sbp('gi.ui/prompt', promptOptions)
          if (result) {
            sbp('gi.ui/clearBanner')
            return sbp('gi.app/identity/_private/logout', state, forkedChain)
          } else {
            sbp('okTurtles.events/emit', LOGIN_ERROR, { username, identityContractID, error: e })
            throw e
          }
        }

        // updating the 'lastLoggedIn' field is done as a periodic notification
        return identityContractID
      } catch (e) {
        console.error('gi.app/identity/login failed!', e)
        const humanErr = L('Failed to log in: {reportError}', LError(e))
        alert(humanErr)
        await sbp('gi.app/identity/_private/logout')
          .catch((e) => {
            console.error('[gi.app/identity/login] Error calling logout (after failure to login)', e)
          })
        throw new GIErrorUIRuntimeError(humanErr)
      }
    })
  },
  'gi.app/identity/signupAndLogin': async function ({ username, email, password }) {
    const contractID = await sbp('gi.app/identity/signup', { username, email, password })
    await sbp('gi.app/identity/login', { username, password, identityContractID: contractID })
    return contractID
  },
  // Unlike the login function, the wrapper for logging out is used using a
  // dedicated selector to allow it to be called from the login selector (if
  // error occurs)
  'gi.app/identity/_private/logout': async function (errorState: ?Object, wipeOut?: boolean) {
    try {
      const state = errorState || cloneDeep(sbp('state/vuex/state'))
      if (!state.loggedIn) return

      const cheloniaState = await sbp('gi.actions/identity/logout')

      const { identityContractID, encryptionParams } = state.loggedIn
      if (encryptionParams) {
        // If we're logging out, save the current Chelonia state under the
        // `.cheloniaState` key. This will be used later when logging in
        // to restore both the Vuex and Chelonia states
        if (!wipeOut) {
          // Save current Chelonia state into the state to be saved
          state.cheloniaState = cheloniaState
          // These keys (contract state) will be restored from the Chelonia
          // state upon login (see `loadState`). Remove them to avoid storing
          // unnecessary data.
          Object.keys(cheloniaState.contracts || {}).forEach((contractID) => {
            delete state[contractID]
          })
          delete state.contracts

          await sbp('state/vuex/save', true, state)
        }
        await sbp('gi.db/settings/deleteStateEncryptionKey', encryptionParams)
        await sbp('appLogs/pauseCapture', { wipeOut: true }) // clear stored logs to prevent someone else accessing sensitve data
      }
      // These should already be deleted, but we attempt to delete them again,
      // just in case.
      if (wipeOut) {
        await Promise.all([
          sbp('gi.db/settings/delete', identityContractID),
          sbp('gi.db/settings/deleteEncrypted', identityContractID),
          sbp('gi.db/settings/delete', SETTING_CHELONIA_STATE)
        ])
      }
    } catch (e) {
      console.error(`${e.name} during logout: ${e.message}`, e)
    }
  },
  'gi.app/identity/logout': (...params) => {
    return sbp('okTurtles.eventQueue/queueEvent', 'APP-LOGIN', ['gi.app/identity/_private/logout', ...params])
  },
  'gi.app/identity/changePassword': async (wOldPassword: Secret<string>, wNewPassword: Secret<string>) => {
    const state = sbp('state/vuex/state')
    if (!state.loggedIn) return
    const getters = sbp('state/vuex/getters')

    const { identityContractID } = state.loggedIn
    const username = getters.usernameFromID(identityContractID)
    const oldPassword = wOldPassword.valueOf()
    const newPassword = wNewPassword.valueOf()

    const [newContractSalt, oldContractSalt, updateToken] = await sbp('gi.app/identity/updateSaltRequest', identityContractID, wOldPassword, wNewPassword)

    const oldIPK = await deriveKeyFromPassword(EDWARDS25519SHA512BATCH, oldPassword, oldContractSalt)
    const oldIEK = await deriveKeyFromPassword(CURVE25519XSALSA20POLY1305, oldPassword, oldContractSalt)
    const newIPK = await deriveKeyFromPassword(EDWARDS25519SHA512BATCH, newPassword, newContractSalt)
    const newIEK = await deriveKeyFromPassword(CURVE25519XSALSA20POLY1305, newPassword, newContractSalt)

    return sbp('gi.actions/identity/changePassword', {
      identityContractID,
      username,
      oldIPK: new Secret(oldIPK),
      oldIEK: new Secret(oldIEK),
      newIPK: new Secret(newIPK),
      newIEK: new Secret(newIEK),
      updateToken: new Secret(updateToken)
    })
  },
  'gi.app/identity/delete': async (contractID: string, wPassword: Secret<string>) => {
    const password = wPassword?.valueOf()
    const transientSecretKeys = []
    let oldKeysAnchorCid

    // If we're creating a new session, here we derive the IEK. This key (not
    // the password) will be passed to the service worker.
    if (password) {
      try {
        // Retrive the salt and the CID (hash) of the message that allows us
        // to decrypt old rotated keys, if any
        const [salt, cid] = await sbp('gi.app/identity/retrieveSalt', contractID, wPassword)
        const IEK = await deriveKeyFromPassword(CURVE25519XSALSA20POLY1305, password, salt)
        transientSecretKeys.push(IEK)
        oldKeysAnchorCid = cid
      } catch (e) {
        console.error('caught error calling retrieveSalt:', e)
        throw new GIErrorUIRuntimeError(L('Incorrect username or password'))
      }
    }

    await sbp('gi.actions/identity/delete', {
      contractID,
      transientSecretKeys: new Secret(transientSecretKeys.map(k => serializeKey(k, true))),
      oldKeysAnchorCid
    })
  }
}): string[])
