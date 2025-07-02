'use strict'

// import SBP stuff before anything else so that domains register themselves before called
import { L, LError } from '@common/common.js'
import '@model/captureLogs.js'
import { setupNativeNotificationsListeners } from '@model/notifications/nativeNotification.js'
import '@sbp/okturtles.data'
import '@sbp/okturtles.eventqueue'
import '@sbp/okturtles.events'
import sbp from '@sbp/sbp'
import ALLOWED_URLS from '@view-utils/allowedUrls.js'
import IdleVue from 'idle-vue'
import { mapGetters, mapMutations, mapState } from 'vuex'
import 'wicg-inert'
import { CONTRACT_IS_SYNCING } from '@chelonia/lib/events'
import '@chelonia/lib/local-selectors'
import { KV_KEYS } from './utils/constants.js'
// import '@chelonia/lib/persistent-actions' // Commented out as persistentActions are not being used
import './controller/app/index.js'
import './controller/backend.js'
import './controller/namespace.js'
import router from './controller/router.js'
import './controller/service-worker.js'
import { SETTING_CURRENT_USER } from './model/database.js'
import store from './model/state.js'
import { KV_EVENT, LOGIN_COMPLETE, LOGIN_ERROR, LOGOUT, NAMESPACE_REGISTRATION, CONTRACT_SYNCS_RESET, OFFLINE, ONLINE, OPEN_MODAL, RECONNECTING, RECONNECTION_FAILED, SERIOUS_ERROR, SWITCH_GROUP, THEME_CHANGE } from './utils/events.js'
import AppStyles from './views/components/AppStyles.vue'
import BannerGeneral from './views/components/banners/BannerGeneral.vue'
import Modal from './views/components/modal/Modal.vue'
import BackgroundSounds from './views/components/sounds/Background.vue'
import Navigation from './views/containers/navigation/Navigation.vue'
import './views/utils/avatar.js'
import './views/utils/i18n.js'
import './views/utils/ui.js'
import './views/utils/vError.js'
import './views/utils/vFocus.js'
// import './views/utils/vSafeHtml.js' // this gets imported by translations, which is part of common.js
import hasAllRequiredFeatures from '@model/featureCheck.js'
import Vue from 'vue'
import notificationsMixin from './model/notifications/mainNotificationsMixin.js'
import './model/notifications/periodicNotifications.js'
import FaviconBadge from './utils/faviconBadge.js'
import './utils/init-vue-plugins.js'
import { showNavMixin } from './views/utils/misc.js'
import './views/utils/vStyle.js'

console.info('GI_VERSION:', process.env.GI_VERSION)
console.info('GI_GIT_VERSION:', process.env.GI_GIT_VERSION)
console.info('CONTRACTS_VERSION:', process.env.CONTRACTS_VERSION)
console.info('LIGHTWEIGHT_CLIENT:', process.env.LIGHTWEIGHT_CLIENT)
console.info('NODE_ENV:', process.env.NODE_ENV)

// this needs to be done early so that any code that depends on it
// (like translations stuff) doesn't break.
sbp('okTurtles.data/set', 'API_URL', self.location.origin)

if (process.env.CI) {
  const originalFetch = self.fetch
  self.fetch = (...args) => {
    return originalFetch.apply(self, args).catch(e => {
      console.error('FETCH FAILED', args, new Error().stack, e)
      throw e
    })
  }
}

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
      'chelonia.db/get',
      'chelonia.db/set',
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

  // Set up event listeners to keep local (Vuex) and Chelonia states in sync
  sbp('chelonia/externalStateSetup', { stateSelector: 'state/vuex/state', reactiveSet: Vue.set, reactiveDel: Vue.delete })

  // [SW] The following is be needed to keep namespace registrations in sync
  // between the SW and each tab. It is not needed if everything is running in
  // the same context
  sbp('okTurtles.events/on', NAMESPACE_REGISTRATION, ({ name, value, deletedValue }) => {
    const cache = sbp('state/vuex/state').namespaceLookups
    const reverseCache = sbp('state/vuex/state').reverseNamespaceLookups
    if (deletedValue) {
      Vue.delete(cache, name)
      if (reverseCache[deletedValue] === name) {
        Vue.delete(reverseCache, deletedValue)
      }
    } else {
      Vue.set(cache, name, value)
      Vue.set(reverseCache, value, name)
    }
  })

  sbp('okTurtles.events/on', SERIOUS_ERROR, (error, { contractID }) => {
    console.error('Serious error', contractID, error)
    sbp('gi.ui/seriousErrorBanner', error)
    if (error?.name === 'ChelErrorForkedChain') {
      const rootState = sbp('state/vuex/state')
      if (!rootState.contracts[contractID]) {
        // If `rootState.contracts[contractID]` doesn't exist, it means we're no
        // longer subscribed to the contract. This could happen, e.g., if the
        // contract has since been released. In any case, the absence of
        // `rootState.contracts[contractID]` means that there's nothing to
        // left to recover.
        console.error('Forked chain detected. However, there is no contract entry.', { contractID }, error)
        return
      }
      const type = rootState.contracts[contractID].type || '(unknown)'
      console.error('Forked chain detected', { contractID, type }, error)

      const retry = confirm(L("The server's history for '{type}' has diverged from ours. This can happen in extremely rare circumstances due to either malicious activity or a bug.\n\nTo fix this, the contract needs to be resynced, and some recent events may be missing. Would you like to do so now?\n\n(If problems persist, please open the Troubleshooting page under the User Settings and resync all contracts.)", { type }))

      if (retry) {
        sbp('gi.ui/clearBanner')
        // If it's our identity contract, we need to log in again to be able
        // to propery decrypt all data, since that requires the user password
        ;((rootState.loggedIn?.identityContractID === contractID)
          ? sbp('gi.actions/identity/logout', null, true)
          : sbp('chelonia/contract/sync', contractID, { resync: true }))
          .catch((e) => {
            console.error('Error during re-sync', contractID, e)
            alert(L('There was a problem resyncing the contract: {errMsg}\n\nPlease see the Application Logs under User Settings for more details. The Troubleshooting page in User Settings may be another way to fix the problem.', { errMsg: e?.message || e }))
          })
      }
    }
    if (process.env.CI) {
      Promise.reject(error)
    }
  })

  // NOTE: setting 'EXPOSE_SBP' in production will make it easier for users to generate contract
  //       actions that they shouldn't be generating, which can lead to bugs or trigger the automated
  //       ban system. Only enable it if you know what you're doing and don't mind the risk.
  // IMPORTANT: setting 'window.sbp' must come *after* 'chelonia/configure' so that the Cypress
  //            tests don't attempt to use the contracts before they're ready!
  if (process.env.NODE_ENV === 'development' || window.Cypress || process.env.EXPOSE_SBP === 'true' || debugParam) {
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
    await sbp('translations/init', navigator.language)
  } catch (e) {
    const errMsg = `Fatal error while initializing Group Income: ${e.name} - ${e.message}\n\nPlease report this bug here: ${ALLOWED_URLS.ISSUE_PAGE}`
    console.error(errMsg, e)
    alert(errMsg)
    return
  }

  // register service-worker
  hasAllRequiredFeatures && await Promise.race(
    [sbp('service-worker/setup'),
      new Promise((resolve, reject) => {
        setTimeout(() => {
          reject(new Error('Timed out setting up service worker'))
        }, 8e3)
      })]
  ).catch(e => {
    console.error('[main] Error setting up service worker', e)
    alert(L('Error while setting up service worker: {err}', { err: e.message }))
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
    created () {
      sbp('okTurtles.events/on', CONTRACT_SYNCS_RESET, (currentSyncs) => {
        this.ephemeral.syncs = currentSyncs
      })
    },
    mounted () {
      let oldIdentityContractID = null // lets us know if there's a previously logged in user
      const reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)') || {}
      if (reducedMotionQuery.matches || this.isInCypress) {
        this.setReducedMotion(true)
      }
      const { bannerGeneral } = this.$refs
      sbp('okTurtles.data/set', 'BANNER', bannerGeneral) // make it globally accessible
      if (!hasAllRequiredFeatures) {
        this.removeLoadingAnimation()
        sbp('gi.ui/prompt', {
          heading: L('Unsupported browser'),
          question: L("This browser doesn't support all features required to use Group Income. Please try a different browser.")
        })
        return
      }
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
      sbp('okTurtles.events/on', LOGIN_COMPLETE, () => {
        setupNativeNotificationsListeners()

        const state = sbp('state/vuex/state')
        if (!state.loggedIn) {
          console.warn('Received LOGIN_COMPLETE event but there state.loggedIn is not an object')
          return
        }
        this.ephemeral.finishedLogin = 'yes'

        if (this.$store.state.currentGroupId) {
          this.initOrResetPeriodicNotifications()
          this.checkAndEmitOneTimeNotifications()
        }
        // NOTE: should set IdleVue plugin here because state could be replaced while logging in
        Vue.use(IdleVue, { store, idleTime: 2 * 60 * 1000 }) // 2 mins of idle config
      })

      // The following are event handlers that affect the root application state.
      // These event handlers should be as simple as possible and put here as a
      // last resort. Event handlers that don't need access to anything defined
      // in this context should be placed in a more appropriate location that is
      // closer semantically to the event (for example, things related to user
      // sessions should go into `app/identity.js` or be an import there).
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
        // Remove the loading animation that sits on top of the Vue app, so that
        // users can properly interact with the app for a follow-up action.
        this.removeLoadingAnimation()
      })
      sbp('okTurtles.events/on', SWITCH_GROUP, ({ contractID, isNewlyCreated }) => {
        this.initOrResetPeriodicNotifications()
        this.checkAndEmitOneTimeNotifications()
      })
      sbp('okTurtles.events/on', ONLINE, () => {
        const state = sbp('state/vuex/state')
        if (state.loggedIn) {
          sbp('service-worker/setup-push-subscription').catch(e => {
            console.error('came back online, tried to report push subscription, but got:', e)
          })
        }
        sbp('gi.ui/clearBanner')
      })
      sbp('okTurtles.events/on', OFFLINE, () => {
        sbp('gi.ui/showBanner', L('Your device appears to be offline.'), 'wifi')
      })
      sbp('okTurtles.events/on', RECONNECTING, () => {
        sbp('gi.ui/showBanner', L('Trying to reconnect...'), 'wifi')
      })
      sbp('okTurtles.events/on', RECONNECTION_FAILED, () => {
        sbp('gi.ui/showBanner', L('We could not connect to the server. Please refresh the page.'), 'wifi')
      })
      sbp('okTurtles.events/on', KV_EVENT, ({ contractID, key, data }) => {
        switch (key) {
          case KV_KEYS.LAST_LOGGED_IN: {
            sbp('state/vuex/commit', 'setLastLoggedIn', [contractID, data])
            break
          }
          case KV_KEYS.UNREAD_MESSAGES:
            sbp('state/vuex/commit', 'setUnreadMessages', data)
            break
          case KV_KEYS.PREFERENCES:
            sbp('state/vuex/commit', 'setPreferences', data)
            break
          case KV_KEYS.NOTIFICATIONS:
            sbp('state/vuex/commit', 'setNotificationStatus', data)
            break
        }
      })

      // Useful in case the app is started in offline mode.
      if (navigator.onLine === false) {
        sbp('okTurtles.events/emit', OFFLINE)
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
      ;(async () => {
        try {
          const identityContractID = await sbp('gi.db/settings/load', SETTING_CURRENT_USER)
          oldIdentityContractID = identityContractID
          if (identityContractID && this.ephemeral.finishedLogin !== 'yes') {
            // Calling login could result in a prompt in case of an error; if the
            // loading animation is visible, it'll hide the prompt. We remove it,
            // so that it's possible to interact with the prompt.
            const removeHandler = sbp('okTurtles.events/once', OPEN_MODAL, () => {
              this.removeLoadingAnimation()
            })
            await sbp('gi.app/identity/login', { identityContractID })
            removeHandler()
            await sbp('chelonia/contract/wait', identityContractID)
          }
          this.ephemeral.ready = true
          this.removeLoadingAnimation()
        } catch (e) {
          this.removeLoadingAnimation()
          oldIdentityContractID && sbp('appLogs/clearLogs', oldIdentityContractID).catch(e => {
            console.error('[main] Error clearing logs for old session', oldIdentityContractID, e)
          }) // https://github.com/okTurtles/group-income/issues/2194
          console.error(`[main] caught ${e?.name} while fetching settings or handling a login error: ${e?.message || e}`, e)
          await sbp('gi.app/identity/logout')
          await sbp('gi.ui/prompt', {
            heading: L('Failed to login'),
            question: L('Error details: {reportError}', LError(e)),
            primaryButton: L('Close')
          })
        }
      })()
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
          'js-reducedMotion': this.$store.state.settings.reducedMotion,
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
