'use strict'

import * as Common from '@common/common.js'
import { debounce, has } from 'turtledash'
import sbp from '@sbp/sbp'
import 'libchelonia'
import type { SPMessage } from 'libchelonia/SPMessage'
import { CONTRACTS_MODIFIED } from 'libchelonia/events'
import { NOTIFICATION_TYPE, PUBSUB_ERROR, REQUEST_TYPE } from 'libchelonia/pubsub'
import { groupContractsByType, syncContractsInOrder } from './controller/actions/utils.js'
import { PUBSUB_INSTANCE } from './controller/instance-keys.js'
import manifests from './model/contracts/manifests.json'
import { SETTING_CHELONIA_STATE, SETTING_CURRENT_USER } from './model/database.js'
import { CHATROOM_USER_STOP_TYPING, CHATROOM_USER_TYPING, CHELONIA_STATE_MODIFIED, KV_EVENT, LOGGING_OUT, LOGIN_COMPLETE, LOGOUT, OFFLINE, ONLINE, RECONNECTING, RECONNECTION_FAILED, SERIOUS_ERROR } from './utils/events.js'
import { KV_KEYS } from './utils/constants.js'

const handleDeletedContract = async (contractID: string) => {
  const { cheloniaState, contractState } = sbp('chelonia/contract/fullState', contractID)
  if (!cheloniaState) return

  await sbp('chelonia/contract/remove', contractID, { permanent: true })

  const type = cheloniaState.type?.replace(/^gi\.contracts\//, 'gi.actions/')
  const handler = type && sbp('sbp/selectors/fn', `${type}/_ondeleted`)

  const currentIdentityState = sbp('state/vuex/getters').currentIdentityState
  // Delete redudant file deletion tokens. If a contract has been deleted, so
  // have been the files it contained, and therefore we no longer need to
  // hold on to their file deletion tokens.
  if (currentIdentityState.fileDeleteTokens) {
    // $FlowFixMe[incompatible-use]
    const manifestCids = Object.entries(currentIdentityState.fileDeleteTokens).filter(([, { billableContractID }]) => {
      return billableContractID === contractID
    }).map(([cid]) => cid)
    await sbp('gi.actions/identity/removeFiles', {
      manifestCids,
      option: {
        shouldDeleteToken: true
      }
    }).catch(e => {
      console.error('[handleDeletedContract] Error deleting saved tokens for deleted contract', contractID, e)
    })
  }

  // Note: when multiple contracts are deleted, the order in which the `handler`
  // is called isn't guaranteed. The `_ondeleted` handlers should be written in
  // such a way that the order in which they're called is of no consequence.
  // For example, a group might use `_ondeleted` to remove it from its associated
  // identity contract, since this is safe. If the identity contract is also being
  // removed, this is at worst redudant, but still safe, since removal of the
  // identity contract also deletes the same information.
  if (typeof handler === 'function') {
    await handler(contractID, contractState).catch(e => {
      console.error('[handleDeletedContract] Error handling deletion of contract', contractID, e)
    })
  } else {
    console.warn('[handleDeletedContract] Received contract deletion notification for contract without a declared deletion handler', contractID, cheloniaState.type)
  }
}

// This function is tasked with most common tasks related to setting up Chelonia
// for Group Income. If Chelonia is running in a service worker, the service
// worker should call this function. On the other hand, if Chelonia is running
// in the browsing context, the browsing context is the one that should call this
// function.
const setupChelonia = async (): Promise<*> => {
  // Load Chelonia state (this needs to be done in the SW when Chelonia is
  // running there)
  // We only load Chelonia state when SETTING_CURRENT_USER is set because,
  // currently, Chelonia only has meaningful persistent state when there's
  // an active session. If there's no logged in user, it means that there's
  // no state to restore.
  // Note that `gi.app/identity/login` and `gi.actions/identity/login` also
  // load Chelonia state. The difference between this and that case is that
  // the code immediately below loads Chelonia state when there already is
  // an active sessin (e.g., when refreshing the page). On the other hand, the
  // login functions _replace_ the Chelonia state with a saved state when a
  // fresh session is started. For example, when logging back in on a device.
  // In short:
  //   - Active session on this device: load state from CHELONIA_STATE directly.
  //   - Completely fresh session (no saved state): fresh state (not loaded from
  //     anywhere).
  //   - Fresh session with saved state: /login logic, CHELONIA_STATE is
  //     decrypyted from the saved state and loaded. This is also saved in
  //     CHELONIA_STATE so that refreshing the page works.
  // Difference between Chelonia state (chelonia/rootState) and Vuex state
  // (state/vuex/state):
  //   1. Chelonia state is authoritative for Chelonia
  //   2. Vuex state is authoritative for Vue
  //   3. There is a single Chelonia state, but there could be many different
  //      instances of Vuex state. (E.g., with a SW, Chelonia is running in a
  //      SW and has a single state there, but each tab has a different Vuex
  //      state)
  //   4. A copy of (parts of) Chelonia state is kept in Vuex state so that
  //      the application can react to contract state changes. However, these
  //      copies are to be considered a cache and are not authoritative.
  //   5. Vuex state is _not_ copied to Chelonia state (i.e., the copying is
  //      in a single direction: Chelonia -> Vuex)
  await sbp('gi.db/settings/load', SETTING_CHELONIA_STATE).then(async (cheloniaState) => {
    if (!cheloniaState) return
    const identityContractID = await sbp('gi.db/settings/load', SETTING_CURRENT_USER)
    if (!identityContractID) return
    await sbp('chelonia/reset', cheloniaState)
    // [SW] If there's an active session, we need to start capture now
    if (typeof WorkerGlobalScope === 'function') {
      await sbp('swLogs/startCapture', identityContractID)
    }
  })

  // Used in 'chelonia/configure' hooks to emit an error notification.
  const errorNotification = (activity: string, error: Error, message: SPMessage, msgMeta?: Object) => {
    sbp('gi.notifications/emit', 'CHELONIA_ERROR', { createdDate: new Date().toISOString(), activity, error, message, msgMeta })
    // Since a runtime error just occured, we likely want to persist app logs to local storage now.
    sbp('appLogs/save').catch(e => {
      console.error('Error saving logs during error notification', e)
    })
  }

  let logoutInProgress = false
  const saveChelonia = () => sbp('okTurtles.eventQueue/queueEvent', SETTING_CHELONIA_STATE, () => {
    if (logoutInProgress) return
    return sbp('gi.db/settings/save', SETTING_CHELONIA_STATE, sbp('chelonia/rootState'))
  })
  const saveCheloniaDebounced = debounce(saveChelonia, 200)

  // When running in a SW, this call here needs to be moved to be made from the
  // SW itself
  await sbp('chelonia/configure', {
    connectionURL: sbp('okTurtles.data/get', 'API_URL'),
    // Because Chelonia state is kept separately from Vuex state, there is
    // no need to override stateSelector. However, `reactiveSet` and `reactiveDel`
    // are still needed to persist Chelonia state (this separation means that
    // Chelonia state and Vuex state need to be persisted separately).
    // // stateSelector: 'state/vuex/state',
    reactiveSet: (o: Object, k: string, v: string) => {
      if (o[k] !== v) {
        o[k] = v
        saveCheloniaDebounced()
      }
    },
    reactiveDel: (o: Object, k: string) => {
      if (has(o, k)) {
        delete o[k]
        saveCheloniaDebounced()
      }
    },
    contracts: {
      ...manifests,
      defaults: {
        modules: { '@common/common.js': Common },
        allowedSelectors: [
          'namespace/lookup', 'namespace/lookupCached',
          // TODO: [SW] the `state/` selectors should _not_ be used from contracts
          // since they refer to Vuex (i.e., tab / window) state and not to
          // Chelonia state.
          'state/vuex/state', 'state/vuex/settings', 'state/vuex/commit', 'state/vuex/getters',
          'chelonia/rootState', 'chelonia/contract/state', 'chelonia/contract/sync', 'chelonia/contract/isSyncing', 'chelonia/contract/remove', 'chelonia/contract/retain', 'chelonia/contract/release', 'controller/router',
          'chelonia/contract/suitableSigningKey', 'chelonia/contract/currentKeyIdByName',
          'chelonia/contract/foreignKeysByContractID',
          'chelonia/contract/setPendingKeyRevocation',
          'chelonia/storeSecretKeys', 'chelonia/crypto/keyId',
          'chelonia/queueInvocation', 'chelonia/contract/wait',
          'chelonia/out/deleteContract',
          'chelonia/contract/waitingForKeyShareTo',
          'chelonia/contract/successfulKeySharesByContractID',
          'gi.actions/group/removeOurselves', 'gi.actions/group/groupProfileUpdate', 'gi.actions/group/displayMincomeChangedPrompt', 'gi.actions/group/addChatRoom',
          'gi.actions/group/join', 'gi.actions/group/joinChatRoom',
          'gi.actions/identity/addJoinDirectMessageKey', 'gi.actions/identity/leaveGroup',
          'gi.actions/chatroom/delete',
          'gi.notifications/emit',
          'gi.actions/out/rotateKeys', 'gi.actions/group/shareNewKeys', 'gi.actions/chatroom/shareNewKeys', 'gi.actions/identity/shareNewPEK',
          'chelonia/out/keyDel',
          'chelonia/contract/disconnect',
          'gi.actions/identity/removeFiles',
          'gi.actions/chatroom/join', 'gi.actions/chatroom/leave',
          'chelonia/contract/hasKeysToPerformOperation',
          'gi.actions/identity/kv/initChatRoomUnreadMessages', 'gi.actions/identity/kv/deleteChatRoomUnreadMessages',
          'gi.actions/identity/kv/setChatRoomReadUntil',
          'gi.actions/identity/kv/addChatRoomUnreadMessage', 'gi.actions/identity/kv/removeChatRoomUnreadMessage'
        ],
        allowedDomains: ['okTurtles.data', 'okTurtles.events', 'okTurtles.eventQueue', 'gi.db', 'gi.contracts'],
        preferSlim: true,
        exposedGlobals: {
          // note: needs to be written this way and not simply "Notification"
          // because that breaks on mobile where Notification is undefined
          Notification: self.Notification
        }
      }
    },
    hooks: {
      syncContractError: (e, contractID) => {
        if (!e) return
        if (e.name === 'ChelErrorResourceGone') {
          console.info('[syncContractError] Contract ID ' + contractID + ' has been deleted')
          handleDeletedContract(contractID).catch(e => {
            console.error('[syncContractError] Error handling contract deletion', e)
          })
        }
        if (['ChelErrorUnrecoverable', 'ChelErrorForkedChain'].includes(e.name)) {
          sbp('okTurtles.events/emit', SERIOUS_ERROR, e, { contractID })
        }
      },
      handleEventError: (e: Error, message: SPMessage) => {
        if (['ChelErrorUnrecoverable', 'ChelErrorForkedChain'].includes(e?.name)) {
          const contractID = message.contractID()
          sbp('okTurtles.events/emit', SERIOUS_ERROR, e, { contractID, message })
        }
        if (sbp('okTurtles.data/get', 'sideEffectError') !== message.hash()) {
          // Avoid duplicate notifications for the same message.
          errorNotification('handleEvent', e, message)
        }
      },
      processError: (e: Error, message: SPMessage, msgMeta: { signingKeyId: string, signingContractID: string, innerSigningKeyId: string, innerSigningContractID: string, index?: number }) => {
        if (e.name === 'GIErrorIgnoreAndBan') {
          sbp('okTurtles.eventQueue/queueEvent', message.contractID(), [
            'gi.actions/group/autobanUser', message, e, msgMeta
          ])
        }
        // For now, we ignore all missing keys errors
        if (e.name === 'ChelErrorDecryptionKeyNotFound') {
          return
        }
        // We also ignore errors related to outgoing messages
        if (message.direction() === 'outgoing') {
          console.warn('Ignoring error on outgoing message', message, e)
          return
        }
        errorNotification('process', e, message, msgMeta)
      },
      sideEffectError: (e: Error, message: SPMessage) => {
        const contractID = message.contractID()
        sbp('okTurtles.events/emit', SERIOUS_ERROR, e, { contractID, message })
        sbp('okTurtles.data/set', 'sideEffectError', message.hash())
        errorNotification('sideEffect', e, message)
      }
    }
  })

  sbp('okTurtles.events/on', LOGIN_COMPLETE, () => {
    const state = sbp('chelonia/rootState')
    if (!state.loggedIn) {
      console.warn('Received LOGIN_COMPLETE event but state.loggedIn is not an object')
      return
    }

    sbp('gi.actions/identity/kv/load').catch(e => {
      console.error("Error from 'gi.actions/identity/kv/load' during login:", e)
    })

    saveChelonia().catch(e => {
      console.error('LOGIN_COMPLETE handler: Error saving Chelonia state', e)
    })
  })

  sbp('okTurtles.events/on', CHELONIA_STATE_MODIFIED, () => {
    saveChelonia().catch(e => {
      console.error('CHELONIA_STATE_MODIFIED handler: Error saving Chelonia state', e)
    })
  })

  sbp('okTurtles.events/on', LOGGING_OUT, () => {
    logoutInProgress = true
  })

  sbp('okTurtles.events/on', LOGOUT, () => {
    // TODO: [SW] This is to be done by the SW
    saveCheloniaDebounced.clear()
    Promise.all([
      sbp('chelonia/reset'),
      sbp('gi.db/settings/delete', SETTING_CHELONIA_STATE)
    ]).catch(e => {
      console.error('Logout event: error deleting Chelonia state:', e)
    }).finally(() => {
      logoutInProgress = false
    })
  })

  sbp('okTurtles.events/on', CONTRACTS_MODIFIED, (_, { added }) => {
    // Wait for the added contracts to be ready, then call the update function
    if (!added.length) return
    const rootState = sbp('chelonia/rootState')
    added.forEach((cID) => {
      switch (rootState.contracts[cID]?.type) {
        case 'gi.contracts/identity':
          if (cID === rootState.loggedIn?.identityContractID) {
            sbp('chelonia/kv/setFilter', cID, [KV_KEYS.UNREAD_MESSAGES, KV_KEYS.PREFERENCES, KV_KEYS.NOTIFICATIONS])
            return
          }
          // Use the default case for foreign identity contracts
          break
        case 'gi.contracts/group':
          sbp('chelonia/kv/setFilter', cID, [KV_KEYS.LAST_LOGGED_IN])
          return
      }
      sbp('chelonia/kv/setFilter', cID, [])
    })
  })

  // must create the connection before we call login
  sbp('okTurtles.data/set', PUBSUB_INSTANCE, sbp('chelonia/connect', {
    messageHandlers: {
      [NOTIFICATION_TYPE.VERSION_INFO] (msg) {
        const ourVersion = process.env.GI_VERSION
        const theirVersion = msg.data.GI_VERSION

        const ourContractsVersion = process.env.CONTRACTS_VERSION
        const theirContractsVersion = msg.data.CONTRACTS_VERSION

        const isContractVersionDiff = ourContractsVersion !== theirContractsVersion
        const isGIVersionDiff = ourVersion !== theirVersion
        // We only compare GI_VERSION in development mode so that the page auto-refreshes if `grunt dev` is re-run
        // This check cannot be done in production mode as it would lead to an infinite page refresh bug
        // when using `grunt deploy` with `grunt serve`
        console.info('VERSION_INFO received:', {
          ourVersion,
          theirVersion,
          ourContractsVersion,
          theirContractsVersion
        })
        if (isContractVersionDiff || isGIVersionDiff) {
          sbp('okTurtles.events/emit', NOTIFICATION_TYPE.VERSION_INFO, msg.data)
        }
      },
      [REQUEST_TYPE.PUSH_ACTION] (msg) {
        sbp('okTurtles.events/emit', REQUEST_TYPE.PUSH_ACTION, { data: msg.data })
      },
      [NOTIFICATION_TYPE.PUB] (msg) {
        const { contractID, innerSigningContractID, data } = msg

        switch (data[0]) {
          case 'gi.contracts/chatroom/user-typing-event': {
            sbp('okTurtles.events/emit', CHATROOM_USER_TYPING, { contractID, innerSigningContractID })
            break
          }
          case 'gi.contracts/chatroom/user-stop-typing-event': {
            sbp('okTurtles.events/emit', CHATROOM_USER_STOP_TYPING, { contractID, innerSigningContractID })
            break
          }
          default: {
            console.log(`[pubsub] Received data from channel ${contractID}:`, data)
          }
        }
      },
      [NOTIFICATION_TYPE.KV] ([key, value]) {
        const { contractID, data } = value
        if (!data) return

        sbp('okTurtles.events/emit', KV_EVENT, { contractID, key, data })
      },
      [NOTIFICATION_TYPE.DELETION] (contractID) {
        console.info('[messageHandler] Contract ID ' + contractID + ' has been deleted')
        handleDeletedContract(contractID).catch(e => {
          console.error('[messageHandler] Error handling contract deletion', e)
        })
      }
    },
    handlers: {
      offline () {
        sbp('okTurtles.events/emit', OFFLINE)
      },
      online () {
        sbp('okTurtles.events/emit', ONLINE)
        console.info('back online!')
      },
      'reconnection-attempt' () {
        sbp('okTurtles.events/emit', RECONNECTING)
      },
      'reconnection-failed' () {
        sbp('okTurtles.events/emit', RECONNECTION_FAILED)
      },
      'reconnection-succeeded' () {
        sbp('okTurtles.events/emit', ONLINE)
        console.info('reconnected to pubsub!')
      }
    }
  }))

  // this should be done here and not in LOGIN_COMPLETE because:
  // If the SW awakens but it's not a navigation event, you'll skip the code syncing all
  // contracts, which will remove all contracts from the push subscription. So, the second
  // time the SW wakes up it'll have no contracts
  sbp('gi.db/settings/load', SETTING_CURRENT_USER).then(async (identityContractID) => {
    // This loads CHELONIA_STATE when _not_ running as a service worker
    const cheloniaState = await sbp('chelonia/rootState')
    if (!cheloniaState || !identityContractID) return
    if (cheloniaState.loggedIn?.identityContractID !== identityContractID) return
    // it is important we first login before syncing any contracts here since that will load the
    // state and the contract sideEffects will sometimes need that state, e.g. loggedIn.identityContractID
    await sbp('chelonia/contract/sync', identityContractID).then(async () => {
      const contractIDs = groupContractsByType(cheloniaState.contracts)
      await syncContractsInOrder(contractIDs)
    }).catch(e => {
      console.error('[setupChelonia] Error syncing identity contract and groups', e)
    })
  })
}

// This implements a 'singleton promise' or 'lazy intialization' of setupChelonia.
// The idea is that `setupChelonia` be called only once, regardless of how many
// actual invocations actually happen (unless the last invocation resolved
// and rejected)
export default ((() => {
  const singletonFn = () => {
    if (!promise) {
      promise = setupChelonia().catch((e) => {
        console.error('[setupChelonia] Error during chelonia setup', e)
        promise = undefined // Reset on error
        throw e // Re-throw the error
      })
    }
    return promise
  }
  let promise

  // Listen for `PUBSUB_ERROR` events. These cause the WS to be destroyed
  // When this happens, if `setupChelonia` has been called, we will reset
  // `promise` and then call `singletonFn` after a short delay.
  sbp('okTurtles.events/on', PUBSUB_ERROR, () => {
    if (!promise) return
    promise = undefined
    setTimeout(() => singletonFn().catch((e) => {
      console.error('[PUBSUB_ERROR handler] Error setting up Chelonia', e)
    }), 100)
  })

  return singletonFn
})(): () => Promise<void>)
