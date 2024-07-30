'use strict'

// import SBP stuff before anything else so that domains register themselves before called
import * as Common from '@common/common.js'
import '@model/captureLogs.js'
import '@sbp/okturtles.data'
import '@sbp/okturtles.eventqueue'
import '@sbp/okturtles.events'
import sbp from '@sbp/sbp'
import ALLOWED_URLS from '@view-utils/allowedUrls.js'
import IdleVue from 'idle-vue'
import { mapGetters, mapMutations, mapState } from 'vuex'
import 'wicg-inert'
import '~/shared/domains/chelonia/chelonia.js'
import type { GIMessage } from '~/shared/domains/chelonia/chelonia.js'
import { CONTRACT_IS_SYNCING } from '~/shared/domains/chelonia/events.js'
import '~/shared/domains/chelonia/localSelectors.js'
// import '~/shared/domains/chelonia/persistent-actions.js' // Commented out as persistentActions are not being used
import { NOTIFICATION_TYPE, REQUEST_TYPE } from '../shared/pubsub.js'
import './controller/actions/index.js'
import './controller/app/index.js'
import './controller/backend.js'
import { PUBSUB_INSTANCE } from './controller/instance-keys.js'
import './controller/namespace.js'
import router from './controller/router.js'
import './controller/service-worker.js'
import manifests from './model/contracts/manifests.json'
import { SETTING_CURRENT_USER } from './model/database.js'
import store from './model/state.js'
import { CHATROOM_USER_STOP_TYPING, CHATROOM_USER_TYPING, LOGIN_COMPLETE, LOGIN_ERROR, LOGOUT, ONLINE, SWITCH_GROUP, THEME_CHANGE } from './utils/events.js'
import AppStyles from './views/components/AppStyles.vue'
import BannerGeneral from './views/components/banners/BannerGeneral.vue'
import Modal from './views/components/modal/Modal.vue'
import BackgroundSounds from './views/components/sounds/Background.vue'
import Navigation from './views/containers/navigation/Navigation.vue'
import './views/utils/avatar.js'
import './views/utils/ui.js'
import './views/utils/vError.js'
import './views/utils/vFocus.js'
// import './views/utils/vSafeHtml.js' // this gets imported by translations, which is part of common.js
import { debounce, has } from '@model/contracts/shared/giLodash.js'
import { groupContractsByType, syncContractsInOrder } from './controller/actions/utils.js'
import notificationsMixin from './model/notifications/mainNotificationsMixin.js'
import './model/notifications/periodicNotifications.js'
import { KV_KEYS } from './utils/constants.js'
import FaviconBadge from './utils/faviconBadge.js'
import './utils/touchInteractions.js'
import { showNavMixin } from './views/utils/misc.js'
import './views/utils/vStyle.js'

const { Vue, L, LError } = Common

console.info('GI_VERSION:', process.env.GI_VERSION)
console.info('CONTRACTS_VERSION:', process.env.CONTRACTS_VERSION)
console.info('LIGHTWEIGHT_CLIENT:', process.env.LIGHTWEIGHT_CLIENT)
console.info('NODE_ENV:', process.env.NODE_ENV)

Vue.config.errorHandler = function (err, vm, info) {
  console.error(`uncaught Vue error in ${info}:`, err)
  // Fix for https://github.com/okTurtles/group-income/issues/684
  if (process.env.CI) throw err
}

async function startApp () {
  // NOTE: we setup this global SBP filter and domain regs here
  //       to get logging for all subsequent SBP calls.
  //       In the future we might move it elsewhere.
  // ?debug=true
  // force debug output even in production
  const debugParam = new URLSearchParams(window.location.search).get('debug')
  if (process.env.NODE_ENV !== 'production' || debugParam === 'true') {
    const reducer = (o, v) => { o[v] = true; return o }
    // Domains for which debug logging won't be enabled.
    const domainBlacklist = [
      'sbp',
      'okTurtles.data'
    ].reduce(reducer, {})
    // Selectors for which debug logging won't be enabled.
    const selectorBlacklist = [
      'chelonia/db/get',
      'chelonia/db/set',
      'chelonia/rootState',
      'chelonia/haveSecretKey',
      'chelonia/private/enqueuePostSyncOps',
      'chelonia/private/invoke',
      'state/vuex/state',
      'state/vuex/getters',
      'state/vuex/settings',
      'gi.db/settings/save'
    ].reduce(reducer, {})
    sbp('sbp/filters/global/add', (domain, selector, data) => {
      if (domainBlacklist[domain] || selectorBlacklist[selector]) return
      console.debug(`[sbp] ${selector}`, data)
    })
    // Re-enable debug logging for 'gi.db/settings/save', but won't log the saved data.
    sbp('sbp/filters/selector/add', 'gi.db/settings/save', (domain, selector, data) => {
      console.debug("[sbp] 'gi.db/settings/save'", data[0])
    })
  }

  // this is to ensure compatibility between frontend and test/backend.test.js
  sbp('okTurtles.data/set', 'API_URL', window.location.origin)

  // Used in 'chelonia/configure' hooks to emit an error notification.
  function errorNotification (activity: string, error: Error, message: GIMessage) {
    sbp('gi.notifications/emit', 'CHELONIA_ERROR', { createdDate: new Date().toISOString(), activity, error, message })
    // Since a runtime error just occured, we likely want to persist app logs to local storage now.
    sbp('appLogs/save')
  }

  // Set up event listeners to keep local (Vuex) and Chelonia states in sync
  sbp('chelonia/externalStateSetup', { stateSelector: 'state/vuex/state', reactiveSet: Vue.set, reactiveDel: Vue.delete })

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
  await sbp('gi.db/settings/load', 'CHELONIA_STATE').then(async (cheloniaState) => {
    if (!cheloniaState) return
    const identityContractID = await sbp('gi.db/settings/load', SETTING_CURRENT_USER)
    if (!identityContractID) return
    await sbp('chelonia/reset', cheloniaState)
  })

  let logoutInProgress = false
  const saveChelonia = () => sbp('okTurtles.eventQueue/queueEvent', 'CHELONIA_STATE', () => {
    if (logoutInProgress) return
    return sbp('gi.db/settings/save', 'CHELONIA_STATE', sbp('chelonia/rootState'))
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

  // TODO: [SW] The following will be needed to keep namespace registrations
  // in sync between the SW and each tab. It is not needed now because everything
  // is running in the same context
  /* sbp('okTurtles.events/on', NAMESPACE_REGISTRATION, ({ name, value }) => {
    const cache = sbp('state/vuex/state').namespaceLookups
    Vue.set(cache, name, value)
  }) */

  // NOTE: setting 'EXPOSE_SBP' in production will make it easier for users to generate contract
  //       actions that they shouldn't be generating, which can lead to bugs or trigger the automated
  //       ban system. Only enable it if you know what you're doing and don't mind the risk.
  // IMPORTANT: setting 'window.sbp' must come *after* 'chelonia/configure' so that the Cypress
  //            tests don't attempt to use the contracts before they're ready!
  if (process.env.NODE_ENV === 'development' || window.Cypress || process.env.EXPOSE_SBP === 'true') {
    // In development mode this makes the SBP API available in the devtools console.
    window.sbp = sbp
  }

  // this is definitely very hacky, but we put it here since two events
  // (CONTRACT_IS_SYNCING)
  // can be called before the main App component is loaded (just after we call login)
  // and we don't yet have access to the component's 'this'
  const initialSyncs = { ephemeral: { debouncedSyncBanner () {}, syncs: [] } }
  const syncFn = function (contractID, isSyncing) {
    // Make it possible for Cypress to wait for contracts to finish syncing.
    if (isSyncing) {
      this.ephemeral.syncs.push(contractID)
      this.ephemeral.debouncedSyncBanner()
    } else if (this.ephemeral.syncs.includes(contractID)) {
      this.ephemeral.syncs = this.ephemeral.syncs.filter(id => id !== contractID)
    }
  }

  const initialSyncFn = syncFn.bind(initialSyncs)
  try {
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
          const rootState = sbp('state/vuex/state')
          const { contractID, data } = value

          if (key === KV_KEYS.LAST_LOGGED_IN && data) {
            Vue.set(rootState.lastLoggedIn, contractID, data)
          } else if (key === KV_KEYS.UNREAD_MESSAGES && data) {
            sbp('state/vuex/commit', 'setUnreadMessages', data)
          } else if (key === KV_KEYS.PREFERENCES && data) {
            sbp('state/vuex/commit', 'setPreferences', data)
          } else if (key === KV_KEYS.NOTIFICATIONS && data) {
            sbp('state/vuex/commit', 'setNotificationStatus', data)
          }
        }
      }
    }))
    await sbp('translations/init', navigator.language)
  } catch (e) {
    const errMsg = `Fatal error while initializing Group Income: ${e.name} - ${e.message}\n\nPlease report this bug here: ${ALLOWED_URLS.ISSUE_PAGE}`
    console.error(errMsg, e)
    alert(errMsg)
    return
  }

  // register service-worker
  await Promise.race(
    [sbp('service-workers/setup'),
      new Promise((resolve, reject) => {
        setTimeout(() => {
          reject(new Error('Timed out setting up service worker'))
        }, 8e3)
      })]
  ).catch(e => {
    console.error('[main] Error setting up service worker', e)
    alert(L('Error while setting up service worker'))
    window.location.reload() // try again, sometimes it fixes it
    throw e
  })

  /* eslint-disable no-new */
  new Vue({
    router: router,
    mixins: [notificationsMixin, showNavMixin],
    components: {
      AppStyles,
      BackgroundSounds,
      BannerGeneral,
      Navigation,
      Modal
    },
    data () {
      return {
        ephemeral: {
          syncs: [],
          // TODO/REVIEW page can load with already loggedin. -> this.$store.state.loggedIn ? 'yes' : 'no'
          finishedLogin: 'no',
          debouncedSyncBanner: null,
          isCorrupted: false, // TODO #761
          ready: false
        }
      }
    },
    mounted () {
      const reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)') || {}
      if (reducedMotionQuery.matches || this.isInCypress) {
        this.setReducedMotion(true)
      }
      const { bannerGeneral } = this.$refs
      sbp('okTurtles.data/set', 'BANNER', bannerGeneral) // make it globally accessible
      // display a self-clearing banner that shows up after we've taken 2 or more seconds
      // to sync a contract.
      this.ephemeral.debouncedSyncBanner = bannerGeneral.debouncedShow({
        // we can't actually show in the global banner what contract is syncing because doing
        // so would involve having to repeatedly call the message() function, and if there
        // were other danger banners that needed to take precedence they would get covered
        message: () => L('Loading events from server...'),
        icon: 'wifi',
        seconds: 2,
        clearWhen: () => !this.ephemeral.syncs.length
      })
      this.ephemeral.syncs = initialSyncs.ephemeral.syncs
      if (this.ephemeral.syncs.length) {
        this.ephemeral.debouncedSyncBanner()
      }
      sbp('okTurtles.events/off', CONTRACT_IS_SYNCING, initialSyncFn)
      sbp('okTurtles.events/on', CONTRACT_IS_SYNCING, syncFn.bind(this))
      sbp('okTurtles.events/on', LOGOUT, () => {
        // TODO: [SW] This is to be done by the SW
        logoutInProgress = true
        saveCheloniaDebounced.clear()
        Promise.all([
          sbp('chelonia/reset'),
          sbp('gi.db/settings/delete', 'CHELONIA_STATE')
        ]).catch(e => {
          console.error('Logout event: error deleting Chelonia state:', e)
        }).finally(() => {
          logoutInProgress = false
        })
      })
      sbp('okTurtles.events/on', LOGIN_COMPLETE, () => {
        const state = sbp('state/vuex/state')
        if (!state.loggedIn) {
          console.warn('Received LOGIN_COMPLETE event but there state.loggedIn is not an object')
          return
        }
        this.ephemeral.finishedLogin = 'yes'

        sbp('gi.actions/identity/kv/load').catch(e => {
          console.error("Error from 'gi.actions/identity/kv/load' during login:", e)
        })

        if (this.$store.state.currentGroupId) {
          this.initOrResetPeriodicNotifications()
          this.checkAndEmitOneTimeNotifications()
        }

        // NOTE: should set IdleVue plugin here because state could be replaced while logging in
        Vue.use(IdleVue, { store, idleTime: 2 * 60 * 1000 }) // 2 mins of idle config

        // TODO: [SW] This should be done by the service worker when logging
        // in
        saveChelonia().catch(e => {
          console.error('LOGIN_COMPLETE handler: Error saving Chelonia state', e)
        })
      })
      sbp('okTurtles.events/on', LOGOUT, () => {
        const state = sbp('state/vuex/state')
        if (!state.loggedIn) return
        this.ephemeral.finishedLogin = 'no'
        // Stop timers related to periodic notifications or persistent actions.
        sbp('gi.periodicNotifications/clearStatesAndStopTimers')
        sbp('gi.db/settings/delete', state.loggedIn.identityContractID).catch(e => {
          console.error('Logout event: error deleting settings')
        })
        sbp('state/vuex/reset')
        router.currentRoute.path !== '/' && router.push({ path: '/' }).catch(console.error)
      })
      sbp('okTurtles.events/once', LOGIN_ERROR, () => {
        // Remove the loading animation that sits on top of the Vue app, so that users can properly interact with the app for a follow-up action.
        this.removeLoadingAnimation()
      })
      sbp('okTurtles.events/on', SWITCH_GROUP, ({ contractID, isNewlyCreated }) => {
        this.initOrResetPeriodicNotifications()
        this.checkAndEmitOneTimeNotifications()
      })

      sbp('okTurtles.data/apply', PUBSUB_INSTANCE, (pubsub) => {
        // Allow access to `L` inside event handlers.
        const L = this.L.bind(this)

        Object.assign(pubsub.customEventHandlers, {
          offline () {
            sbp('gi.ui/showBanner', L('Your device appears to be offline.'), 'wifi')
          },
          online () {
            sbp('gi.ui/clearBanner')
            sbp('okTurtles.events/emit', ONLINE)
            console.info('back online!')
          },
          'reconnection-attempt' () {
            sbp('gi.ui/showBanner', L('Trying to reconnect...'), 'wifi')
          },
          'reconnection-failed' () {
            sbp('gi.ui/showBanner', L('We could not connect to the server. Please refresh the page.'), 'wifi')
          },
          'reconnection-succeeded' () {
            sbp('gi.ui/clearBanner')
            sbp('okTurtles.events/emit', ONLINE)
            console.info('reconnected to pubsub!')
          },
          'subscription-succeeded' (event) {
            const { channelID } = event.detail
            if (channelID in sbp('state/vuex/state').contracts) {
              sbp('chelonia/contract/sync', channelID, { force: true }).catch(err => {
                console.warn(`[chelonia] Syncing contract ${channelID} failed: ${err.message}`)
              })
            }
          }
        })
      })

      // Useful in case the app is started in offline mode.
      if (navigator.onLine === false) {
        sbp('gi.ui/showBanner', L('Your device appears to be offline.'), 'wifi')
      }
      if (this.ephemeral.isCorrupted) {
        sbp('gi.ui/dangerBanner',
          L('Your app seems to be corrupted. Please {a_}re-sync your app data.{_a}', {
            'a_': `<a class="link" href="${window.location.pathname}?modal=UserSettingsModal&tab=troubleshooting">`,
            '_a': '</a>'
          }),
          'times-circle'
        )
      }

      sbp('okTurtles.events/emit', THEME_CHANGE, this.$store.state.settings.themeColor)
      this.setBadgeOnTab()

      // Now that the app is ready, we proceed to call /login (which will restore
      // the user's session, if they are already logged in)
      // Since this is asynchronous, we must check this.ephemeral.finishedLogin
      // to ensure that we don't override user interactions that have already
      // happened (an example where things can happen this quickly is in the
      // tests).
      let oldIdentityContractID = null
      sbp('gi.db/settings/load', SETTING_CURRENT_USER).then(async (identityContractID) => {
        oldIdentityContractID = identityContractID
        // This loads CHELONIA_STATE when _not_ running as a service worker
        const cheloniaState = await sbp('gi.db/settings/load', 'CHELONIA_STATE')
        if (!cheloniaState || !identityContractID) return
        if (cheloniaState.loggedIn?.identityContractID !== identityContractID) return
        if (this.ephemeral.finishedLogin === 'yes') return
        // it is important we first login before syncing any contracts here since that will load the
        // state and the contract sideEffects will sometimes need that state, e.g. loggedIn.identityContractID
        await sbp('gi.app/identity/login', { identityContractID })
        await sbp('chelonia/contract/sync', identityContractID, { force: true })
        const contractIDs = groupContractsByType(cheloniaState.contracts)
        await syncContractsInOrder(contractIDs)
      }).catch(async e => {
        this.removeLoadingAnimation()
        oldIdentityContractID && sbp('appLogs/clearLogs', oldIdentityContractID) // https://github.com/okTurtles/group-income/issues/2194
        console.error(`[main] caught ${e?.name} while fetching settings or handling a login error: ${e?.message || e}`, e)
        await sbp('gi.app/identity/logout')
        await sbp('gi.ui/prompt', {
          heading: L('Failed to login'),
          question: L('Error details: {reportError}', LError(e)),
          primaryButton: L('Close')
        })
      }).finally(() => {
        this.ephemeral.ready = true
        this.removeLoadingAnimation()
      })
    },
    computed: {
      ...mapGetters(['groupsByName', 'ourUnreadMessages', 'totalUnreadNotificationCount']),
      ...mapState(['contracts']),
      ourUnreadMessagesCount () {
        return Object.keys(this.ourUnreadMessages)
          .map(cId => (this.ourUnreadMessages[cId].unreadMessages).length)
          .reduce((a, b) => a + b, 0)
      },
      shouldSetBadge () {
        return this.ourUnreadMessagesCount + this.totalUnreadNotificationCount > 0
      },
      appClasses () {
        return {
          'l-with-navigation': this.showNav,
          'l-no-navigation': !this.showNav,
          'js-reducedMotion': this.$store.state.reducedMotion,
          'is-dark-theme': this.$store.getters.isDarkTheme
        }
      },
      isInCypress () {
        return !!window.Cypress
      }
    },
    methods: {
      ...mapMutations([
        'setReducedMotion'
      ]),
      setBadgeOnTab () {
        FaviconBadge.setBubble(this.shouldSetBadge)
      },
      removeLoadingAnimation () {
        // remove the minimal loading animation in index.html
        const loadingScreenEl = document.querySelector('#main-loading-screen')
        loadingScreenEl && loadingScreenEl.remove()
      }
    },
    watch: {
      shouldSetBadge (to, from) {
        this.setBadgeOnTab()
      }
    },
    store // make this and all child components aware of the new store
  }).$mount('#app')
}

startApp()
