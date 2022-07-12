'use strict'

// import SBP stuff before anything else so that domains register themselves before called
import sbp from '@sbp/sbp'
import '@sbp/okturtles.data'
import '@sbp/okturtles.events'
import '@sbp/okturtles.eventqueue'
import Vue from 'vue'
import { mapMutations } from 'vuex'
import 'wicg-inert'

import '@model/captureLogs.js'
import { GIMessage } from '~/shared/domains/chelonia/chelonia.js'
import { CONTRACT_IS_SYNCING } from '~/shared/domains/chelonia/events.js'
import './controller/namespace.js'
import './controller/actions/index.js'
import './controller/backend.js'
import router from './controller/router.js'
import { PUBSUB_INSTANCE } from './controller/instance-keys.js'
import store from './model/state.js'
import { SETTING_CURRENT_USER } from './model/database.js'
import { LOGIN, LOGOUT } from './utils/events.js'
import BannerGeneral from './views/components/banners/BannerGeneral.vue'
import Navigation from './views/containers/navigation/Navigation.vue'
import AppStyles from './views/components/AppStyles.vue'
import Modal from './views/components/modal/Modal.vue'
import L, { LError, LTags } from '@view-utils/translations.js'
import ALLOWED_URLS from '@view-utils/allowedUrls.js'
import './views/utils/avatar.js'
import './views/utils/vFocus.js'
import './views/utils/vError.js'
import './views/utils/vSafeHtml.js'
import './views/utils/vStyle.js'
import './utils/touchInteractions.js'

console.info('GI_VERSION:', process.env.GI_VERSION)
console.info('NODE_ENV:', process.env.NODE_ENV)

Vue.config.errorHandler = function (err, vm, info) {
  console.error(`uncaught Vue error in ${info}:`, err)
}

async function startApp () {
  // NOTE: we setup this global SBP filter and domain regs here
  //       to get logging for all subsequent SBP calls.
  //       In the future we might move it elsewhere.
  // ?debug=true
  // force debug output even in production
  const debugParam = new URLSearchParams(window.location.search).get('debug')
  if (process.env.NODE_ENV !== 'production' || debugParam === 'true') {
    // Domains for which debug logging won't be enabled.
    const domainBlacklist = new Set([
      'sbp',
      'okTurtles.data'
    ])
    // Selectors for which debug logging won't be enabled.
    const selectorBlacklist = new Set([
      'chelonia/db/get',
      'chelonia/db/logHEAD',
      'chelonia/db/set',
      'state/vuex/state',
      'state/vuex/getters',
      'gi.db/settings/save'
    ])
    sbp('sbp/filters/global/add', (domain, selector, data) => {
      if (domainBlacklist.has(domain) || selectorBlacklist.has(selector)) return
      console.debug(`[sbp] ${selector}`, data)
    })
    // Re-enable debug logging for 'gi.db/settings/save', but won't log the saved data.
    sbp('sbp/filters/selector/add', 'gi.db/settings/save', (domain, selector, data) => {
      console.debug("[sbp] 'gi.db/settings/save'", data[0])
    })
  }

  function contractName (contractID: string): string {
    return sbp('state/vuex/state').contracts[contractID]?.type || contractID
  }

  // this is to ensure compatibility between frontend and test/backend.test.js
  sbp('okTurtles.data/set', 'API_URL', window.location.origin)
  function notificationError (activity: string) {
    return function (e: Error, message: GIMessage) {
      const contractID = message.contractID()
      const [opType] = message.op()
      const { action, meta } = message.decryptedValue()
      sbp('gi.notifications/emit', 'ERROR', {
        message: L("{errName} during {activity} for '{action}' from {b_}{who}{_b} to '{contract}': '{errMsg}'", {
          ...LTags('b'),
          errName: e.name,
          activity,
          action: action || opType,
          who: meta?.username || 'TODO: signing keyID',
          contract: contractName(contractID),
          errMsg: e.message || '?'
        })
      })
      // Since a runtime error just occured, we likely want to persist app logs to local storage now.
      sbp('appLogs/save')
    }
  }
  function displaySeriousErrorBanner (e: Error) {
    sbp('okTurtles.data/get', 'BANNER').danger(
      L('Fatal error: {reportError}', LError(e)), 'exclamation-triangle'
    )
  }
  sbp('chelonia/configure', {
    connectionURL: sbp('okTurtles.data/get', 'API_URL'),
    stateSelector: 'state/vuex/state',
    reactiveSet: Vue.set,
    reactiveDel: Vue.delete,
    hooks: {
      handleEventError: (e: Error, message: GIMessage) => {
        if (e.name === 'ChelErrorUnrecoverable') {
          displaySeriousErrorBanner(e)
        }
        if (sbp('okTurtles.data/get', 'sideEffectError') !== message.hash()) {
          // avoid duplicate notifications for the same message
          notificationError('handleEvent')(e, message)
        }
      },
      processError: (e: Error, message: GIMessage) => {
        if (e.name === 'GIErrorIgnoreAndBan') {
          sbp('okTurtles.eventQueue/queueEvent', message.contractID(), [
            'gi.actions/group/autobanUser', message, e
          ])
        }
        notificationError('process')(e, message)
      },
      sideEffectError: (e: Error, message: GIMessage) => {
        displaySeriousErrorBanner(e)
        sbp('okTurtles.data/set', 'sideEffectError', message.hash())
        notificationError('sideEffect')(e, message)
      }
    }
  })

  // NOTE: setting 'EXPOSE_SBP' in production will make it easier for users to generate contract
  //       actions that they shouldn't be generating, which can lead to bugs or trigger the automated
  //       ban system. Only enable it if you know what you're doing and don't mind the risk.
  if (process.env.NODE_ENV === 'development' || window.Cypress || process.env.EXPOSE_SBP === 'true') {
    // In development mode this makes the SBP API available in the devtools console.
    window.sbp = sbp
  }
  // this is definitely very hacky, but we put it here since CONTRACT_IS_SYNCING can
  // be called before the main App component is loaded (just after we call login)
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
    sbp('okTurtles.data/set', PUBSUB_INSTANCE, sbp('chelonia/connect'))
    await sbp('translations/init', navigator.language)
    // NOTE: important to do this before setting up Vue.js because a lot of that relies
    //       on the router stuff which has guards that expect the contracts to be loaded
    const username = await sbp('gi.db/settings/load', SETTING_CURRENT_USER)
    try {
      if (username) {
        sbp('okTurtles.events/on', CONTRACT_IS_SYNCING, initialSyncFn)
        await sbp('gi.actions/identity/login', { username })
      }
    } catch (e) {
      console.error(`caught ${e.name} while logging in: ${e.message}`, e)
      await sbp('gi.actions/identity/logout')
      console.warn(`It looks like the local user '${username}' does not exist anymore on the server 😱 If this is unexpected, contact us at https://gitter.im/okTurtles/group-income`)
      // TODO: handle this better
      await sbp('gi.db/settings/delete', username)
    }
  } catch (e) {
    const errMsg = `Fatal error while initializing Group Income: ${e.name} - ${e.message}\n\nPlease report this bug here: ${ALLOWED_URLS.ISSUE_PAGE}`
    console.error(errMsg, e)
    alert(errMsg)
    return
  }

  /* eslint-disable no-new */
  new Vue({
    router: router,
    components: {
      AppStyles,
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
          isCorrupted: false // TODO #761
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
      sbp('okTurtles.events/on', LOGIN, () => {
        this.ephemeral.finishedLogin = 'yes'
      })
      sbp('okTurtles.events/on', LOGOUT, () => {
        this.ephemeral.finishedLogin = 'no'
        router.currentRoute.path !== '/' && router.push({ path: '/' }).catch(console.error)
      })
      // call from anywhere in the app:
      // sbp('okTurtles.data/get', 'BANNER').show(L('Trying to reconnect...'), 'wifi')
      // sbp('okTurtles.data/get', 'BANNER').danger(L('message'), 'icon-type')
      // sbp('okTurtles.data/get', 'BANNER').clean()
      sbp('okTurtles.data/apply', PUBSUB_INSTANCE, (pubsub) => {
        const banner = this.$refs.bannerGeneral
        // Allow to access `L` inside event handlers.
        const L = this.L.bind(this)

        Object.assign(pubsub.customEventHandlers, {
          offline () {
            banner.show(L('Your device appears to be offline.'), 'wifi')
          },
          online () {
            banner.clean()
          },
          'reconnection-attempt' () {
            banner.show(L('Trying to reconnect...'), 'wifi')
          },
          'reconnection-failed' () {
            banner.show(L('We could not connect to the server. Please refresh the page.'), 'wifi')
          },
          'reconnection-succeeded' () {
            banner.clean()
          }
        })
      })
      // Useful in case the app is started in offline mode.
      if (navigator.onLine === false) {
        this.$refs.bannerGeneral.show(L('Your device appears to be offline.'), 'wifi')
      }
      if (this.ephemeral.isCorrupted) {
        this.$refs.bannerGeneral.danger(
          L('Your app seems to be corrupted. Please {a_}re-sync your app data.{_a}', {
            'a_': `<a class="link" href="${window.location.pathname}?modal=UserSettingsModal&section=troubleshooting">`,
            '_a': '</a>'
          }),
          'times-circle'
        )
      }
    },
    computed: {
      showNav () {
        return this.$store.state.loggedIn && this.$store.getters.groupsByName.length > 0 && this.$route.path !== '/join'
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
      ])
    },
    store // make this and all child components aware of the new store
  }).$mount('#app')
}

startApp()
