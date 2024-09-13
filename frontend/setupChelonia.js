'use strict'

import * as Common from '@common/common.js'
import { debounce, has } from '@model/contracts/shared/giLodash.js'
import sbp from '@sbp/sbp'
import '~/shared/domains/chelonia/chelonia.js'
import type { GIMessage } from '~/shared/domains/chelonia/chelonia.js'
import { NOTIFICATION_TYPE, REQUEST_TYPE } from '../shared/pubsub.js'
import { groupContractsByType, syncContractsInOrder } from './controller/actions/utils.js'
import { PUBSUB_INSTANCE } from './controller/instance-keys.js'
import manifests from './model/contracts/manifests.json'
import { SETTING_CHELONIA_STATE, SETTING_CURRENT_USER } from './model/database.js'
import { CHATROOM_USER_STOP_TYPING, CHATROOM_USER_TYPING, KV_EVENT, LOGIN_COMPLETE, LOGOUT, OFFLINE, ONLINE, RECONNECTING, RECONNECTION_FAILED } from './utils/events.js'

// This function is tasked with most common tasks related to setting up Chelonia
// for Group Income. If Chelonia is running in a service worker, the service
// worker should call this function. On the other hand, if Chelonia is running
// in the browsing context, the service worker is the one that should call this
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
  })

  // this is to ensure compatibility between frontend and test/backend.test.js
  sbp('okTurtles.data/set', 'API_URL', window.location.origin)

  // Used in 'chelonia/configure' hooks to emit an error notification.
  const errorNotification = (activity: string, error: Error, message: GIMessage) => {
    sbp('gi.notifications/emit', 'CHELONIA_ERROR', { createdDate: new Date().toISOString(), activity, error, message })
    // Since a runtime error just occured, we likely want to persist app logs to local storage now.
    sbp('appLogs/save')
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
          'chelonia/storeSecretKeys', 'chelonia/crypto/keyId',
          'chelonia/queueInvocation', 'chelonia/contract/wait',
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
          Notification: window.Notification
        }
      }
    },
    hooks: {
      handleEventError: (e: Error, message: GIMessage) => {
        if (e.name === 'ChelErrorUnrecoverable') {
          sbp('gi.ui/seriousErrorBanner', e)
        }
        if (sbp('okTurtles.data/get', 'sideEffectError') !== message.hash()) {
          // Avoid duplicate notifications for the same message.
          errorNotification('handleEvent', e, message)
        }
      },
      processError: (e: Error, message: GIMessage, msgMeta: { signingKeyId: string, signingContractID: string, innerSigningKeyId: string, innerSigningContractID: string }) => {
        if (e.name === 'GIErrorIgnoreAndBan') {
          sbp('okTurtles.eventQueue/queueEvent', message.contractID(), [
            'gi.actions/group/autobanUser', message, e, msgMeta
          ])
        }
        // For now, we ignore all missing keys errors
        if (e.name === 'ChelErrorDecryptionKeyNotFound') {
          return
        }
        errorNotification('process', e, message)
      },
      sideEffectError: (e: Error, message: GIMessage) => {
        sbp('gi.ui/seriousErrorBanner', e)
        sbp('okTurtles.data/set', 'sideEffectError', message.hash())
        errorNotification('sideEffect', e, message)
      }
    }
  })

  // TODO: This needs to be relayed from the originating tab to the SW. Maybe
  // creating a selector would be more appropriate.
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

  sbp('okTurtles.events/on', LOGOUT, () => {
    // TODO: [SW] This is to be done by the SW
    logoutInProgress = true
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
      },
      'subscription-succeeded' (event) {
        const { channelID } = event.detail
        if (channelID in sbp('chelonia/rootState').contracts) {
          sbp('chelonia/contract/sync', channelID, { force: true }).catch(err => {
            console.warn(`[chelonia] Syncing contract ${channelID} failed: ${err.message}`)
          })
        }
      }
    }
  }))

  await sbp('gi.db/settings/load', SETTING_CURRENT_USER).then(async (identityContractID) => {
    // This loads CHELONIA_STATE when _not_ running as a service worker
    const cheloniaState = await sbp('gi.db/settings/load', SETTING_CHELONIA_STATE)
    if (!cheloniaState || !identityContractID) return
    if (cheloniaState.loggedIn?.identityContractID !== identityContractID) return
    // it is important we first login before syncing any contracts here since that will load the
    // state and the contract sideEffects will sometimes need that state, e.g. loggedIn.identityContractID
    await sbp('chelonia/contract/sync', identityContractID, { force: true })
    const contractIDs = groupContractsByType(cheloniaState.contracts)
    await syncContractsInOrder(contractIDs)
  })
}

export default setupChelonia
