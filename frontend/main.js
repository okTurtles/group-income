'use strict'

// import SBP stuff before anything else so that domains register themselves before called
import '@model/captureLogs.js'
import '@sbp/okturtles.data'
import '@sbp/okturtles.eventqueue'
import '@sbp/okturtles.events'
import sbp from '@sbp/sbp'
import IdleVue from 'idle-vue'
import { mapGetters, mapMutations, mapState } from 'vuex'
import 'wicg-inert'
import { GIMessage } from '~/shared/domains/chelonia/GIMessage.js'
// import '~/shared/domains/chelonia/chelonia.js'
import * as Common from '@common/common.js'
import { CONTRACT_IS_SYNCING, CONTRACTS_MODIFIED, EVENT_HANDLED } from '~/shared/domains/chelonia/events.js'
import { NOTIFICATION_TYPE, REQUEST_TYPE } from '../shared/pubsub.js'
import './controller/namespace.js'
import { CHATROOM_USER_STOP_TYPING, CHATROOM_USER_TYPING, DELETED_CHATROOM, JOINED_CHATROOM, JOINED_GROUP, LEFT_CHATROOM, LEFT_GROUP, LOGIN, LOGIN_ERROR, LOGOUT, NAMESPACE_REGISTRATION, SHELTER_EVENT_HANDLED, SWITCH_GROUP, THEME_CHANGE } from './utils/events.js'
// import './controller/actions/index.js'
import './controller/app/index.js'
import './controller/backend.js'
import './controller/service-worker.js'
// import '~/shared/domains/chelonia/persistent-actions.js'
import ALLOWED_URLS from '@view-utils/allowedUrls.js'
import { deserializer, serializer } from '~/shared/serdes/index.js'
import { PUBSUB_INSTANCE } from './controller/instance-keys.js'
import router from './controller/router.js'
import manifests from './model/contracts/manifests.json'
import { SETTING_CURRENT_USER } from './model/database.js'
import store from './model/state.js'
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
import { has } from '@model/contracts/shared/giLodash.js'
import { Secret } from '~/shared/domains/chelonia/Secret.js'
import notificationsMixin from './model/notifications/mainNotificationsMixin.js'
import './model/notifications/periodicNotifications.js'
import { KV_KEYS } from './utils/constants.js'
import FaviconBadge from './utils/faviconBadge.js'
import './utils/touchInteractions.js'
import { showNavMixin } from './views/utils/misc.js'
import './views/utils/vStyle.js'

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

deserializer.register(GIMessage)
deserializer.register(Secret)

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

  // Wait for DB to be ready
  await sbp('gi.db/ready')

  // this is to ensure compatibility between frontend and test/backend.test.js
  sbp('okTurtles.data/set', 'API_URL', window.location.origin)

  // Used in 'chelonia/configure' hooks to emit an error notification.
  function errorNotification (activity: string, error: Error, message: GIMessage) {
    sbp('gi.notifications/emit', 'CHELONIA_ERROR', { activity, error, message })
    // Since a runtime error just occured, we likely want to persist app logs to local storage now.
    sbp('appLogs/save')
  }
  /*
  await sbp('gi.db/settings/load', 'CHELONIA_STATE').then(async (cheloniaState) => {
    // TODO: PLACEHOLDER TO SIMULATE CHELONIA IN A SW
    if (!cheloniaState) return
    const identityContractID = await sbp('gi.db/settings/load', SETTING_CURRENT_USER)
    if (!identityContractID) return
    Object.assign(sbp('chelonia/rootState'), cheloniaState)
    console.error('@@@@SET CHELONIA STATE[main.js]', identityContractID, sbp('chelonia/rootState'), cheloniaState)
  })
  console.error('@@@@@@@@')
  /* const save = debounce(() => sbp('okTurtles.eventQueue/queueEvent', 'CHELONIA_STATE', () => {
    return sbp('gi.db/settings/save', 'CHELONIA_STATE', sbp('chelonia/rootState'))
  })) */

  // register service-worker
  await sbp('service-workers/setup')

  /* TODO: MOVE TO ANOTHER FILE */
  const swRpc = (() => {
    let controller = navigator.serviceWorker.controller
    navigator.serviceWorker.addEventListener('controllerchange', (ev) => {
      controller = navigator.serviceWorker.controller
    }, false)

    return (...args) => {
      return new Promise((resolve, reject) => {
        const messageChannel = new MessageChannel()
        messageChannel.port1.addEventListener('message', (event) => {
          if (event.data && Array.isArray(event.data)) {
            const r = deserializer(event.data[1])
            if (event.data[0] === true) {
              resolve(r)
            } else {
              reject(r)
            }
            messageChannel.port1.close()
          }
        }, false)
        messageChannel.port1.addEventListener('messageerror', (event) => {
          reject(event.data)
          messageChannel.port1.close()
        }, false)
        messageChannel.port1.start()
        const { data, transferables } = serializer(args)
        controller.postMessage({
          type: 'sbp',
          port: messageChannel.port2,
          data
        }, [messageChannel.port2, ...transferables])
      })
    }
  })()

  sbp('sbp/selectors/register', {
    'gi.actions/*': swRpc
  })
  sbp('sbp/selectors/register', {
    'chelonia/*': swRpc
  })

  sbp('okTurtles.events/on', JOINED_CHATROOM, ({ identityContractID, groupContractID, chatRoomID }) => {
    const rootState = sbp('state/vuex/state')
    if (rootState.loggedIn?.identityContractID !== identityContractID) return
    if (!rootState.chatroom.currentChatRoomIDs[groupContractID]) {
      sbp('state/vuex/commit', 'setCurrentChatRoomId', { groupID: groupContractID, chatRoomID })
    }
  })

  sbp('okTurtles.events/on', JOINED_GROUP, ({ identityContractID, groupContractID }) => {
    const rootState = sbp('state/vuex/state')
    if (rootState.loggedIn?.identityContractID !== identityContractID) return
    if (!rootState[groupContractID]) return
    if (!rootState.currentGroupId) {
      sbp('state/vuex/commit', 'setCurrentGroupId', groupContractID)
      sbp('state/vuex/commit', 'setCurrentChatRoomId', {})
    }
  })

  const switchCurrentChatRoomHandler = ({ identityContractID, groupContractID, chatRoomID }) => {
    const rootState = sbp('state/vuex/state')
    if (identityContractID && rootState.loggedIn?.identityContractID !== identityContractID) return
    if (!rootState[groupContractID]) return
    if (rootState.chatroom.currentChatRoomIDs[groupContractID] === chatRoomID) {
      const id = rootState[groupContractID].generalChatRoomId || Object.entries(rootState[groupContractID].chatRooms).find(([id, value]) => {
        return id !== chatRoomID && value.members[identityContractID]?.status === 'active'
      })?.[0]
      if (id) {
        sbp('state/vuex/commit', 'setCurrentChatRoomId', { groupID: groupContractID, chatRoomID: id })
      }
    }
  }

  sbp('okTurtles.events/on', LEFT_CHATROOM, switchCurrentChatRoomHandler)
  sbp('okTurtles.events/on', DELETED_CHATROOM, switchCurrentChatRoomHandler)

  sbp('okTurtles.events/on', LEFT_GROUP, ({ identityContractID, groupContractID }) => {
    const rootState = sbp('state/vuex/state')
    console.error('@@@@@yy LEFT GROUP', identityContractID, groupContractID)
    if (rootState.loggedIn?.identityContractID !== identityContractID) return
    const state = rootState[identityContractID]
    // grab the groupID of any group that we're a part of
    const currentGroupId = rootState.currentGroupId
    if (!currentGroupId || currentGroupId === groupContractID) {
      const groupIdToSwitch = Object.keys(state.groups)
        .filter(cID =>
          cID !== groupContractID
        ).sort(cID =>
        // prefer successfully joined groups
          sbp('state/vuex/state')[cID]?.profiles?.[groupContractID] ? -1 : 1
        )[0] || null
      sbp('state/vuex/commit', 'setCurrentChatRoomId', {})
      sbp('state/vuex/commit', 'setCurrentGroupId', groupIdToSwitch)
      if (currentGroupId === groupContractID) {
        sbp('controller/router').push({ path: '/' }).catch(() => {})
      }
    }
  })

  sbp('okTurtles.events/on', SWITCH_GROUP, ({ contractID }) => {
    sbp('state/vuex/commit', 'setCurrentGroupId', contractID)
  })
  /* TODO: END MOVE TO ANOTHER FILE */

  isNaN(0) && await sbp('chelonia/configure', {
    connectionURL: sbp('okTurtles.data/get', 'API_URL'),
    /*
    stateSelector: 'state/vuex/state',
    reactiveSet: Vue.set,
    reactiveDel: Vue.delete,
    */
    /* reactiveSet: (o: Object, k: string, v: string) => {
      // TODO: PLACEHOLDER TO SIMULATE CHELONIA SERVICE WORKER SAVING STATE
      // TODO: DOES THE STATE EVEN NEED TO BE SAVED OR IS RAM ENOUGH?
      if (o[k] !== v) {
        o[k] = v
        save()
      }
    },
    reactiveDel: (o: Object, k: string) => {
      // TODO: PLACEHOLDER TO SIMULATE CHELONIA SERVICE WORKER SAVING STATE
      // TODO: DOES THE STATE EVEN NEED TO BE SAVED OR IS RAM ENOUGH?
      if (Object.prototype.hasOwnProperty.call(o, k)) {
        delete o[k]
        save()
      }
    }, */
    contracts: {
      ...manifests,
      defaults: {
        modules: { '@common/common.js': Common },
        allowedSelectors: [
          'namespace/lookup', 'namespace/lookupCached',
          'state/vuex/state', 'state/vuex/settings', 'state/vuex/commit', 'state/vuex/getters',
          'chelonia/contract/state',
          'chelonia/contract/sync', 'chelonia/contract/isSyncing', 'chelonia/contract/remove', 'chelonia/contract/retain', 'chelonia/contract/release', 'controller/router',
          'chelonia/contract/suitableSigningKey', 'chelonia/contract/currentKeyIdByName',
          'chelonia/storeSecretKeys', 'chelonia/crypto/keyId',
          'chelonia/queueInvocation', 'chelonia/contract/wait',
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
          'gi.actions/identity/removeFiles',
          'gi.actions/chatroom/join',
          'chelonia/contract/hasKeysToPerformOperation',
          'gi.actions/identity/initChatRoomUnreadMessages', 'gi.actions/identity/deleteChatRoomUnreadMessages',
          'gi.actions/identity/setChatRoomReadUntil',
          'gi.actions/identity/addChatRoomUnreadMessage', 'gi.actions/identity/removeChatRoomUnreadMessage'
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

  sbp('okTurtles.events/on', EVENT_HANDLED, async (contractID, message) => {
    // TODO: WRITE THIS MORE EFFICIENTLY SO THAT ONLY THE RELEVANT PARTS ARE
    // COPIED INSTEAD OF THE ENTIRE CHELONIA STATE
    const cheloniaState = await sbp('chelonia/rootState')
    const state = cheloniaState[contractID]
    const contractState = cheloniaState.contracts[contractID]
    const vuexState = sbp('state/vuex/state')
    if (contractState) {
      if (!vuexState.contracts) {
        Vue.set(vuexState, 'contracts', Object.create(null))
      }
      Vue.set(vuexState.contracts, contractID, JSON.parse(JSON.stringify(contractState)))
    } else if (vuexState.contracts) {
      Vue.delete(vuexState.contracts, contractState)
    }
    if (state) {
      Vue.set(vuexState, contractID, JSON.parse(JSON.stringify(state)))
    } else {
      Vue.delete(vuexState, contractID)
    }
    sbp('okTurtles.events/emit', SHELTER_EVENT_HANDLED, contractID, message)
  })

  sbp('okTurtles.events/on', CONTRACTS_MODIFIED, async (subscriptionSet) => {
    // TODO: WRITE THIS MORE EFFICIENTLY SO THAT ONLY THE RELEVANT PARTS ARE
    // COPIED INSTEAD OF THE ENTIRE CHELONIA STATE
    const cheloniaState = await sbp('chelonia/rootState')
    const vuexState = sbp('state/vuex/state')

    if (!vuexState.contracts) {
      Vue.set(vuexState, 'contracts', Object.create(null))
    }

    const oldContracts = Object.keys(vuexState.contracts)
    const oldContractsToRemove = oldContracts.filter(x => !subscriptionSet.includes(x))
    const newContracts = subscriptionSet.filter(x => !oldContracts.includes(x))

    oldContractsToRemove.forEach(x => {
      Vue.delete(vuexState.contracts, x)
      Vue.delete(vuexState, x)
    })
    newContracts.forEach(x => {
      const state = cheloniaState[x]
      const contractState = cheloniaState.contracts[x]
      if (contractState) {
        Vue.set(vuexState.contracts, x, JSON.parse(JSON.stringify(contractState)))
      }
      if (state) {
        Vue.set(vuexState, x, JSON.parse(JSON.stringify(state)))
      }
    })
  })

  sbp('okTurtles.events/on', NAMESPACE_REGISTRATION, ({ name, value }) => {
    const cache = sbp('state/vuex/state').namespaceLookups
    Vue.set(cache, name, value)
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
    isNaN(0) && sbp('okTurtles.data/set', PUBSUB_INSTANCE, sbp('chelonia/connect', {
      messageHandlers: {
        [NOTIFICATION_TYPE.VERSION_INFO] (msg) {
          const isDevelopment = process.env.NODE_ENV === 'development'
          const ourVersion = process.env.GI_VERSION
          const theirVersion = msg.data.GI_VERSION

          const ourContractsVersion = process.env.CONTRACTS_VERSION
          const theirContractsVersion = msg.data.CONTRACTS_VERSION

          const isContractVersionDiff = ourContractsVersion !== theirContractsVersion
          const isGIVersionDiff = ourVersion !== theirVersion
          // We only compare GI_VERSION in development mode so that the page auto-refreshes if `grunt dev` is re-run
          // This check cannot be done in production mode as it would lead to an infinite page refresh bug
          // when using `grunt deploy` with `grunt serve`
          if (isContractVersionDiff || (isDevelopment && isGIVersionDiff)) {
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
        },
        [NOTIFICATION_TYPE.KV] ([key, data]) {
          const rootState = sbp('state/vuex/state')
          const { contractID, data: value } = data

          if (key === KV_KEYS.LAST_LOGGED_IN && value) {
            Vue.set(rootState.lastLoggedIn, contractID, value)
          } else if (key === KV_KEYS.UNREAD_MESSAGES && value) {
            sbp('state/vuex/commit', 'setUnreadMessages', value)
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
      sbp('okTurtles.events/on', LOGIN, () => {
        this.ephemeral.finishedLogin = 'yes'

        if (this.$store.state.currentGroupId) {
          this.initOrResetPeriodicNotifications()
          this.checkAndEmitOneTimeNotifications()
        }
        /* const databaseKey = `chelonia/persistentActions/${sbp('state/vuex/getters').ourIdentityContractId}`
        sbp('chelonia.persistentActions/configure', { databaseKey })
        await sbp('chelonia.persistentActions/load')
        */

        // NOTE: should set IdleVue plugin here because state could be replaced while logging in
        Vue.use(IdleVue, { store, idleTime: 2 * 60 * 1000 }) // 2 mins of idle config
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
        /*
        sbp('chelonia.persistentActions/unload')
        */
        router.currentRoute.path !== '/' && router.push({ path: '/' }).catch(console.error)
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

        isNaN(0) && Object.assign(pubsub.customEventHandlers, {
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
      isNaN(1) && sbp('gi.db/settings/load', 'CHELONIA_STATE').then(async (cheloniaState) => {
        // TODO: PLACEHOLDER TO SIMULATE CHELONIA IN A SW
        const identityContractID = await sbp('gi.db/settings/load', SETTING_CURRENT_USER)
        if (!cheloniaState || !identityContractID) return
        const contractSyncPriorityList = [
          'gi.contracts/identity',
          'gi.contracts/group',
          'gi.contracts/chatroom'
        ]
        const getContractSyncPriority = (key) => {
          const index = contractSyncPriorityList.indexOf(key)
          return index === -1 ? contractSyncPriorityList.length : index
        }
        await sbp('chelonia/contract/sync', identityContractID, { force: true })
        const contractIDs = Object.keys(cheloniaState.contracts)
        await Promise.all(Object.entries(contractIDs).sort(([a], [b]) => {
          // Sync contracts in order based on type
          return getContractSyncPriority(a) - getContractSyncPriority(b)
        }).map(([, ids]) => {
          return sbp('okTurtles.eventQueue/queueEvent', `appStart:${identityContractID ?? '(null)'}`, ['chelonia/contract/sync', ids, { force: true }])
        }))
      })

      sbp('gi.db/settings/load', SETTING_CURRENT_USER).then(identityContractID => {
        if (!identityContractID || this.ephemeral.finishedLogin === 'yes') return
        return sbp('gi.app/identity/login', { identityContractID }).catch((e) => {
          console.error(`[main] caught ${e?.name} while logging in: ${e?.message || e}`, e)
          console.warn(`It looks like the local user '${identityContractID}' does not exist anymore on the server 😱 If this is unexpected, contact us at https://gitter.im/okTurtles/group-income`)
        })
      }).catch(e => {
        console.error(`[main] caught ${e?.name} while fetching settings or handling a login error: ${e?.message || e}`, e)
      }).finally(() => {
        // Wait for SW to be ready
        navigator.serviceWorker.ready.then(() => {
          const onready = () => {
            this.ephemeral.ready = true
            this.removeLoadingAnimation()
          }
          if (!navigator.serviceWorker.controller) {
            const listener = (ev) => {
              navigator.serviceWorker.removeEventListener('controllerchange', listener, false)
              onready()
            }
            navigator.serviceWorker.addEventListener('controllerchange', listener, false)
          } else {
            onready()
          }
        })
      })
    },
    computed: {
      ...mapGetters(['groupsByName', 'ourUnreadMessages', 'totalUnreadNotificationCount']),
      ...mapState(['contracts']),
      ourUnreadMessagesCount () {
        return Object.keys(this.ourUnreadMessages)
          // TODO: need to remove the '|| []' after we release 0.2.*
          .map(cId => (this.ourUnreadMessages[cId].unreadMessages || []).length)
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

sbp('okTurtles.events/on', LOGIN, async ({ identityContractID, encryptionParams, state }) => {
  const vuexState = sbp('state/vuex/state')
  if (vuexState.loggedIn) {
    throw new Error('Received login event but there already is an active session')
  }
  const cheloniaState = await sbp('chelonia/rootState')
  if (state) {
    // TODO Do this in a cleaner way
    // Exclude contracts from the state
    Object.keys(state).forEach(k => {
      if (k.startsWith('z9br')) {
        delete state[k]
      }
    })
    Object.keys(cheloniaState.contracts).forEach(k => {
      if (cheloniaState[k]) {
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
    const state = vuexState
    // Exclude contracts from the state
    Object.keys(state).forEach(k => {
      if (k.startsWith('z9br')) {
        Vue.delete(state, k)
      }
    })
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
  }

  if (encryptionParams) {
    sbp('state/vuex/commit', 'login', { identityContractID, encryptionParams })
  }

  // NOTE: users could notice that they leave the group by someone
  // else when they log in
  const currentState = sbp('state/vuex/state')
  if (!currentState.currentGroupId) {
    const gId = Object.keys(currentState.contracts)
      .find(cID => has(currentState[identityContractID].groups, cID))

    if (gId) {
      sbp('gi.app/group/switch', gId)
    }
  }

  // Whenever there's an active session, the encrypted save state should be
  // removed, as it is only used for recovering the state when logging in
  sbp('gi.db/settings/deleteEncrypted', identityContractID).catch(e => {
    console.error('Error deleting encrypted settings after login')
  })
})

startApp()
