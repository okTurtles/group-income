'use strict'

// import SBP stuff before anything else so that domains register themselves before called
import sbp from '@sbp/sbp'
import '@sbp/okturtles.data'
import '@sbp/okturtles.events'
import '@sbp/okturtles.eventqueue'
import { CONTRACT_IS_SYNCING } from '~/shared/domains/chelonia/chelonia.js'
import './controller/namespace.js'
import './controller/actions/index.js'
import Vue from 'vue'
import { mapMutations } from 'vuex'
import router from './controller/router.js'
import { PUBSUB_INSTANCE } from './controller/instance-keys.js'
import store from './model/state.js'
import { SETTING_CURRENT_USER } from './model/database.js'
import { LOGIN, LOGOUT } from './utils/events.js'
import { GIMessage } from '~/shared/domains/chelonia/GIMessage.js'
import BannerGeneral from './views/components/banners/BannerGeneral.vue'
import Navigation from './views/containers/navigation/Navigation.vue'
import AppStyles from './views/components/AppStyles.vue'
import Modal from './views/components/modal/Modal.vue'
import L, { LError, LTags } from '@view-utils/translations.js'
import './views/utils/allowedUrls.js'
import './views/utils/translations.js'
import './views/utils/avatar.js'
import './views/utils/vFocus.js'
import './views/utils/vError.js'
import './views/utils/vSafeHtml.js'
import './views/utils/vStyle.js'
import './utils/touchInteractions.js'
import 'wicg-inert'

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
    const reducer = (o, v) => { o[v] = true; return o }
    const domainBlacklist = [
      'sbp',
      'okTurtles.data'
    ].reduce(reducer, {})
    const selBlacklist = [
      'chelonia/db/get',
      'chelonia/db/logHEAD',
      'chelonia/db/set',
      'state/vuex/state',
      'state/vuex/getters'
    ].reduce(reducer, {})
    sbp('sbp/filters/global/add', (domain, selector, data) => {
      if (domainBlacklist[domain] || selBlacklist[selector]) return
      console.debug(`[sbp] ${selector}`, data)
    })
  }

  // this is to ensure compatibility between frontend and test/backend.test.js
  sbp('okTurtles.data/set', 'API_URL', window.location.origin)
  function notificationError (activity: string) {
    return function (e: Error, message: GIMessage) {
      const contractID = message.contractID()
      const [opType] = message.op()
      const { action, meta } = message.decryptedValue()
      sbp('gi.notifications/emit', 'ERROR', {
        ...LTags('b'),
        message: L("{errName} during {activity} for '{action}' from {b_}{who}{_b} to '{contract}': '{errMsg}'", {
          errName: e.name,
          activity,
          action: action || opType,
          who: meta?.username || 'TODO: signing keyID',
          contract: sbp('state/vuex/state').contracts[contractID]?.type || contractID,
          errMsg: e.message || '?'
        })
      })
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
    hooks: {
      handleEventError: (e: Error, message: GIMessage) => {
        if (e.name === 'ChelErrorUnrecoverable') {
          displaySeriousErrorBanner(e)
        }
        notificationError('handleEvent')(e, message)
      },
      processError: (e: Error, message: GIMessage) => {
        if (e.name === 'GIErrorIgnoreAndBan') {
          sbp('okTurtles.eventQueue/queueEvent', message.contractID(), [
            'gi.actions/group/autobanUser', message, e
          ])
        }
        notificationError('process')
      },
      sideEffectError: (e: Error, message: GIMessage) => {
        displaySeriousErrorBanner(e)
        notificationError('sideEffect')
      }
    }
  })
  sbp('okTurtles.data/set', PUBSUB_INSTANCE, sbp('chelonia/connect'))

  await sbp('translations/init', navigator.language)

  const username = await sbp('gi.db/settings/load', SETTING_CURRENT_USER)
  if (username) {
    const identityContractID = await sbp('namespace/lookup', username)
    if (identityContractID) {
      await sbp('state/vuex/dispatch', 'login', { username, identityContractID })
    } else {
      await sbp('state/vuex/dispatch', 'logout')
      console.warn(`It looks like the local user '${username}' does not exist anymore on the server 😱 If this is unexpected, contact us at https://gitter.im/okTurtles/group-income`)
      // TODO: do not delete the username like this! handle this better!
      //       because of how await works, this exception handler can be triggered
      //       even by random errors from Vue.js, example:
      //
      //         lookup failed! TypeError: "state[state.currentGroupId] is undefined"
      //         memberUsernames state.js:231
      //
      //       Which doesn't mean that the lookup actually failed!
      await sbp('gi.db/settings/delete', username)
    }
  }
  if (process.env.NODE_ENV === 'development' || window.Cypress) {
    // In development mode this makes the SBP API available in the devtools console.
    window.sbp = sbp
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
          isCorrupted: false // TODO #761
        }
      }
    },
    mounted () {
      const reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)') || {}
      if (reducedMotionQuery.matches || this.isInCypress) {
        this.setReducedMotion(true)
      }
      sbp('okTurtles.events/on', CONTRACT_IS_SYNCING, (contractID, isSyncing) => {
        // Make it possible for Cypress to wait for contracts to finish syncing.
        if (isSyncing) {
          this.ephemeral.syncs.push(contractID)
          this.$refs.bannerGeneral.show(L('Loading events from server...'), 'wifi')
        } else {
          this.ephemeral.syncs = this.ephemeral.syncs.filter(id => id !== contractID)
          if (!this.ephemeral.syncs.length) {
            this.$refs.bannerGeneral.clean()
          }
        }
      })
      sbp('okTurtles.events/on', LOGIN, () => {
        this.ephemeral.finishedLogin = 'yes'
      })
      sbp('okTurtles.events/on', LOGOUT, () => {
        this.ephemeral.finishedLogin = 'no'
        router.currentRoute.path !== '/' && router.push({ path: '/' }).catch(console.error)
      })
      sbp('okTurtles.data/set', 'BANNER', this.$refs.bannerGeneral)
      // call from anywhere in the app:
      // sbp('okTurtles.data/get', 'BANNER').show(L('Trying to reconnect...'), 'wifi')
      // sbp('okTurtles.data/get', 'BANNER').danger(L('message'), 'icon-type')
      // sbp('okTurtles.data/get', 'BANNER').clean()
      sbp('okTurtles.data/apply', PUBSUB_INSTANCE, (instance) => {
        const banner = this.$refs.bannerGeneral
        // Allow to access `L` inside event handlers.
        const L = this.L.bind(this)

        Object.assign(instance.customEventHandlers, {
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
        this.$refs.bannerGeneral.show(
          this.L('Your device appears to be offline.'), 'wifi'
        )
      }
      if (this.ephemeral.isCorrupted) {
        this.$refs.bannerGeneral.danger(
          this.L('Your app seems to be corrupted. Please {a_}re-sync your app data.{_a}', {
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
