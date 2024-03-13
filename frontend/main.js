'use strict'

// import SBP stuff before anything else so that domains register themselves before called
import sbp from '@sbp/sbp'
import '@sbp/okturtles.data'
import '@sbp/okturtles.events'
import '@sbp/okturtles.eventqueue'
import { mapMutations, mapGetters, mapState } from 'vuex'
import 'wicg-inert'
import '@model/captureLogs.js'
import type { GIMessage } from '~/shared/domains/chelonia/chelonia.js'
import '~/shared/domains/chelonia/chelonia.js'
import { CONTRACT_IS_SYNCING } from '~/shared/domains/chelonia/events.js'
import { NOTIFICATION_TYPE, REQUEST_TYPE } from '../shared/pubsub.js'
import * as Common from '@common/common.js'
import { LOGIN, LOGOUT, LOGIN_ERROR, SWITCH_GROUP, THEME_CHANGE, CHATROOM_USER_TYPING, CHATROOM_USER_STOP_TYPING } from './utils/events.js'
import './controller/namespace.js'
import './controller/actions/index.js'
import './controller/backend.js'
import './controller/service-worker.js'
import '~/shared/domains/chelonia/persistent-actions.js'
import manifests from './model/contracts/manifests.json'
import router from './controller/router.js'
import { PUBSUB_INSTANCE } from './controller/instance-keys.js'
import store from './model/state.js'
import { SETTING_CURRENT_USER } from './model/database.js'
import BackgroundSounds from './views/components/sounds/Background.vue'
import BannerGeneral from './views/components/banners/BannerGeneral.vue'
import Navigation from './views/containers/navigation/Navigation.vue'
import AppStyles from './views/components/AppStyles.vue'
import Modal from './views/components/modal/Modal.vue'
import ALLOWED_URLS from '@view-utils/allowedUrls.js'
import './views/utils/avatar.js'
import './views/utils/ui.js'
import './views/utils/vFocus.js'
import './views/utils/vError.js'
// import './views/utils/vSafeHtml.js' // this gets imported by translations, which is part of common.js
import './views/utils/vStyle.js'
import './utils/touchInteractions.js'
import './model/notifications/periodicNotifications.js'
import notificationsMixin from './model/notifications/mainNotificationsMixin.js'
import { showNavMixin } from './views/utils/misc.js'
import FaviconBadge from './utils/faviconBadge.js'

const { Vue, L } = Common

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
    sbp('gi.notifications/emit', 'CHELONIA_ERROR', { activity, error, message })
    // Since a runtime error just occured, we likely want to persist app logs to local storage now.
    sbp('appLogs/save')
  }
  await sbp('chelonia/configure', {
    connectionURL: sbp('okTurtles.data/get', 'API_URL'),
    stateSelector: 'state/vuex/state',
    reactiveSet: Vue.set,
    reactiveDel: Vue.delete,
    contracts: {
      ...manifests,
      defaults: {
        modules: { '@common/common.js': Common },
        allowedSelectors: [
          'namespace/lookup', 'namespace/lookupCached',
          'state/vuex/state', 'state/vuex/settings', 'state/vuex/commit', 'state/vuex/getters',
          'chelonia/contract/sync', 'chelonia/contract/isSyncing', 'chelonia/contract/remove', 'chelonia/contract/cancelRemove', 'controller/router',
          'chelonia/contract/suitableSigningKey', 'chelonia/contract/currentKeyIdByName',
          'chelonia/storeSecretKeys', 'chelonia/crypto/keyId',
          'chelonia/queueInvocation',
          'chelonia/contract/waitingForKeyShareTo',
          'chelonia/contract/successfulKeySharesByContractID',
          'gi.actions/chatroom/leave',
          'gi.actions/group/removeOurselves', 'gi.actions/group/groupProfileUpdate', 'gi.actions/group/displayMincomeChangedPrompt', 'gi.actions/group/addChatRoom',
          'gi.actions/group/join', 'gi.actions/group/joinChatRoom',
          'gi.actions/identity/addJoinDirectMessageKey', 'gi.actions/identity/leaveGroup',
          'gi.notifications/emit',
          'gi.actions/out/rotateKeys', 'gi.actions/group/shareNewKeys', 'gi.actions/chatroom/shareNewKeys', 'gi.actions/identity/shareNewPEK',
          'chelonia/out/keyDel',
          'chelonia/contract/disconnect',
          'gi.actions/chatroom/join',
          'chelonia/contract/hasKeysToPerformOperation'
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
          if (ourVersion !== theirVersion || ourContractsVersion !== theirContractsVersion) {
            sbp('okTurtles.events/emit', NOTIFICATION_TYPE.VERSION_INFO, { ...msg.data })
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
  await sbp('service-workers/setup')

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
      sbp('okTurtles.events/on', LOGIN, async () => {
        this.ephemeral.finishedLogin = 'yes'

        if (this.$store.state.currentGroupId) {
          this.initOrResetPeriodicNotifications()
          this.checkAndEmitOneTimeNotifications()
        }
        const databaseKey = `chelonia/persistentActions/${sbp('state/vuex/getters').ourIdentityContractId}`
        sbp('chelonia.persistentActions/configure', { databaseKey })
        await sbp('chelonia.persistentActions/load')
      })
      sbp('okTurtles.events/on', LOGOUT, () => {
        this.ephemeral.finishedLogin = 'no'
        router.currentRoute.path !== '/' && router.push({ path: '/' }).catch(console.error)
        // Stop timers related to periodic notifications or persistent actions.
        sbp('gi.periodicNotifications/clearStatesAndStopTimers')
        sbp('chelonia.persistentActions/unload')
      })
      sbp('okTurtles.events/once', LOGIN_ERROR, () => {
        // Remove the loading animation that sits on top of the Vue app, so that users can properly interact with the app for a follow-up action.
        this.removeLoadingAnimation()
      })
      sbp('okTurtles.events/on', SWITCH_GROUP, () => {
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
          },
          'reconnection-attempt' () {
            sbp('gi.ui/showBanner', L('Trying to reconnect...'), 'wifi')
          },
          'reconnection-failed' () {
            sbp('gi.ui/showBanner', L('We could not connect to the server. Please refresh the page.'), 'wifi')
          },
          'reconnection-succeeded' () {
            sbp('gi.ui/clearBanner')
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
      sbp('gi.db/settings/load', SETTING_CURRENT_USER).then(identityContractID => {
        if (!identityContractID || this.ephemeral.finishedLogin === 'yes') return
        return sbp('gi.actions/identity/login', { identityContractID }).catch((e) => {
          console.error(`[main] caught ${e?.name} while logging in: ${e?.message || e}`, e)
          console.warn(`It looks like the local user '${identityContractID}' does not exist anymore on the server 😱 If this is unexpected, contact us at https://gitter.im/okTurtles/group-income`)
        })
      }).catch(e => {
        console.error(`[main] caught ${e?.name} while fetching settings or handling a login error: ${e?.message || e}`, e)
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
          // TODO: need to remove the '|| []' after we release 0.2.*
          .map(cId => (this.ourUnreadMessages[cId].messages || []).length)
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
