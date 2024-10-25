'use strict'

import { GIErrorUIRuntimeError, L, LError, LTags } from '@common/common.js'
import { cloneDeep } from '@model/contracts/shared/giLodash.js'
import sbp from '@sbp/sbp'
import Vue from 'vue'
import { LOGIN, LOGIN_COMPLETE, LOGIN_ERROR, NEW_PREFERENCES, NEW_UNREAD_MESSAGES } from '~/frontend/utils/events.js'
import { Secret } from '~/shared/domains/chelonia/Secret.js'
import { boxKeyPair, buildRegisterSaltRequest, computeCAndHc, decryptContractSalt, hash, hashPassword, randomNonce } from '~/shared/zkpp.js'
// Using relative path to crypto.js instead of ~-path to workaround some esbuild bug
import { CURVE25519XSALSA20POLY1305, EDWARDS25519SHA512BATCH, deriveKeyFromPassword, serializeKey } from '../../../shared/domains/chelonia/crypto.js'
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
      return { encryptionParams, state, cheloniaState: null }
    }
  } else {
    const state = await sbp('gi.db/settings/load', identityContractID)

    // cheloniaState is only stored in settings when logging in with a password
    // If there's an active session, then chelnoiaState is stored and
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
  'gi.app/identity/retrieveSalt': async (username: string, password: Secret<string>) => {
    const r = randomNonce()
    const b = hash(r)
    const authHash = await fetch(`${sbp('okTurtles.data/get', 'API_URL')}/zkpp/${encodeURIComponent(username)}/auth_hash?b=${encodeURIComponent(b)}`)
      .then(handleFetchResult('json'))

    const { authSalt, s, sig } = authHash

    const h = await hashPassword(password.valueOf(), authSalt)

    const [c, hc] = computeCAndHc(r, s, h)

    const contractHash = await fetch(`${sbp('okTurtles.data/get', 'API_URL')}/zkpp/${encodeURIComponent(username)}/contract_hash?${(new URLSearchParams({
      'r': r,
      's': s,
      'sig': sig,
      'hc': Buffer.from(hc).toString('base64').replace(/\//g, '_').replace(/\+/g, '-').replace(/=*$/, '')
    })).toString()}`).then(handleFetchResult('text'))

    return decryptContractSalt(c, contractHash)
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

    // next create the identity contract itself
    try {
      const userID = await sbp('gi.actions/identity/create', {
        // TODO: Wrap IPK and IEK in "Secret"
        IPK: serializeKey(IPK, true),
        IEK: serializeKey(IEK, true),
        publishOptions,
        username,
        email,
        picture,
        r,
        s,
        sig,
        Eh
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
        identityContractID = await sbp('namespace/lookup', username)
      }

      if (!identityContractID) {
        throw new GIErrorUIRuntimeError(L('Incorrect username or password'))
      }

      const password = wpassword?.valueOf()
      const transientSecretKeys = []

      // If we're creating a new session, here we derive the IEK. This key (not
      // the password) will be passed to the service worker.
      if (password) {
        try {
          const salt = await sbp('gi.app/identity/retrieveSalt', username, wpassword)
          const IEK = await deriveKeyFromPassword(CURVE25519XSALSA20POLY1305, password, salt)
          transientSecretKeys.push(IEK)
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
              sbp('okTurtles.events/off', LOGIN_ERROR, loginErrorHandler, { identityContractID, state })
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
              sbp('okTurtles.events/off', LOGIN_COMPLETE, loginCompleteHandler)
              if (id === identityContractID) {
                reject(error)
              } else {
                reject(new Error(`Identity contract ID mismatch during login (on error): ${identityContractID} != ${id}`))
              }
            }

            sbp('okTurtles.events/once', LOGIN_COMPLETE, loginCompleteHandler)
            sbp('okTurtles.events/once', LOGIN_ERROR, loginErrorHandler)
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
            await sbp('gi.actions/identity/login', { identityContractID, encryptionParams, cheloniaState, state, transientSecretKeys: transientSecretKeys.map(k => new Secret(serializeKey(k, true))) })
          } else {
            try {
              await sbp('chelonia/contract/sync', identityContractID)
            } catch (e) {
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

          const promptOptions = {
            heading: L('Login error'),
            question: L('Do you want to log out? {br_}Error details: {err}.', { err: errMessage, ...LTags() }),
            primaryButton: L('No'),
            secondaryButton: L('Yes')
          }

          const result = await sbp('gi.ui/prompt', promptOptions)
          if (!result) {
            return sbp('gi.app/identity/_private/logout', state)
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
    const contractIDs = await sbp('gi.app/identity/signup', { username, email, password })
    await sbp('gi.app/identity/login', { username, password })
    return contractIDs
  },
  // Unlike the login function, the wrapper for logging out is used using a
  // dedicated selector to allow it to be called from the login selector (if
  // error occurs)
  'gi.app/identity/_private/logout': async function (errorState: ?Object) {
    try {
      const state = errorState || cloneDeep(sbp('state/vuex/state'))
      if (!state.loggedIn) return

      const cheloniaState = await sbp('gi.actions/identity/logout')

      const { encryptionParams } = state.loggedIn
      if (encryptionParams) {
        // If we're logging out, save the current Chelonia state under the
        // `.cheloniaState` key. This will be used later when logging in
        // to restore both the Vuex and Chelonia states
        state.cheloniaState = cheloniaState

        await sbp('state/vuex/save', true, state)
        await sbp('gi.db/settings/deleteStateEncryptionKey', encryptionParams)
        await sbp('appLogs/pauseCapture', { wipeOut: true }) // clear stored logs to prevent someone else accessing sensitve data
      }
    } catch (e) {
      console.error(`${e.name} during logout: ${e.message}`, e)
    }
  },
  'gi.app/identity/logout': (...params) => {
    return sbp('okTurtles.eventQueue/queueEvent', 'APP-LOGIN', ['gi.app/identity/_private/logout', ...params])
  }
}): string[])
