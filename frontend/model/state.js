'use strict'

// This file handles application-level state (as opposed to component-level
// state) per: http://vuex.vuejs.org/en/intro.html

import sbp from '@sbp/sbp'
import { CHELONIA_RESET, CONTRACTS_MODIFIED, EVENT_HANDLED, CONTRACT_REGISTERED } from '@chelonia/lib/events'
import { LOGOUT } from '~/frontend/utils/events.js'
import Vue from 'vue'
import Vuex from 'vuex'
import { cloneDeep, debounce } from 'turtledash'
import { applyStorageRules } from '~/frontend/model/notifications/utils.js'
import getters from './getters.js'

// Vuex modules.
import notificationModule from '~/frontend/model/notifications/vuexModule.js'
import settingsModule from '~/frontend/model/settings/vuexModule.js'
import chatroomModule from '~/frontend/model/chatroom/vuexModule.js'

// Wrapper function for performing contract upgrades and migrations
// Unused as of https://github.com/okTurtles/group-income/pull/2525. For
// usage examples see commit 01e9169d9dcb294da1e6aea88d75a185887fa861
// TODO: Consider moving this function into a different file
// eslint-disable-next-line no-unused-vars
const contractUpdate = (initialState: Object, updateFn: (state: Object, contractIDHints: ?string[]) => any, contractType: ?string) => {
  // Wrapper for the update function. This performs a common check, namely that
  // the contract is of a certain type, which helps return early
  const wrappedUpdateFn = contractType
  // The following disable is because eslint gets confused with 'Object'
  // eslint-disable-next-line no-use-before-define
    ? (state: Object, contractIDHints: ?string[]) => {
        if (Array.isArray(contractIDHints)) {
          if (!contractIDHints.some(contractID => state.contracts[contractID]?.type === contractType)) {
            return
          }
        }
        updateFn(state, contractIDHints)
      }
    : updateFn

  const resetHandler = () => {
    sbp('okTurtles.events/off', CONTRACTS_MODIFIED, modifiedHandler)
  }
  // This function is called when the set of subscribed contracts is modified
  const modifiedHandler = (_, { added }) => {
    // Wait for the added contracts to be ready, then call the update function
    if (!added.length) return
    sbp('chelonia/contract/wait', added).then(() => {
      const state = sbp('state/vuex/state')
      wrappedUpdateFn(state, added)
    })
  }

  // Add event listeners for `CONTRACTS_MODIFIED` and `CHELONIA_RESET` events
  // `CONTRACTS_MODIFIED` is the important event. This is what allows updating
  // contracts that are newly synced (for example, when logging in for the
  // first time or joining an existing group or chatroom)
  sbp('okTurtles.events/on', CONTRACTS_MODIFIED, modifiedHandler)
  // Receiving `CHELONIA_RESET` means that a new session has started. To prevent
  // memory leaks and duplicate handlers, this event will remove the
  // `CONTRACTS_MODIFIED` handler.
  sbp('okTurtles.events/once', CHELONIA_RESET, resetHandler)

  // Call the update function in the next tick
  // We want this (in addition to `CONTRACTS_MODIFIED`) because this way we
  // can update contracts that already exist, e.g., upon login with a saved
  // state
  const existingContracts = Object.keys(initialState.contracts)
  setTimeout(() => {
    sbp('chelonia/contract/wait', existingContracts).then(() => {
      const state = sbp('state/vuex/state')
      wrappedUpdateFn(state, existingContracts)
    })
  }, 0)
}

Vue.use(Vuex)

const initialState = {
  currentGroupId: null,
  contracts: {}, // contractIDs => { type:string, HEAD:string, height:number } (for contracts we've successfully subscribed to)
  loggedIn: false, // false | { username: string, identityContractID: string }
  namespaceLookups: Object.create(null), // { [username]: sbp('namespace/lookup') }
  reverseNamespaceLookups: Object.create(null), // { [contractID]: username }
  contractSigningKeys: Object.create(null),
  lastLoggedIn: {}, // Group last logged in information
  preferences: {}, // { hideDistributionBanner: { [groupContractID]: boolean } }
  periodicNotificationAlreadyFiredMap: {
    alreadyFired: Object.create(null), // { notificationKey: boolean },
    lastRun: Object.create(null) // { notificationKey: number },
  }
}

if (window.matchMedia) {
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', e => {
    if (sbp('state/vuex/getters').theme === 'system') {
      store.commit('setTheme', 'system')
    }
  })
}

const reactiveDate = Vue.observable({ date: new Date() })
setInterval(function () {
  // We want the getters to recalculate all of the payments within 1 minute of us entering a new period.
  const rememberedPeriodStamp = store.getters.periodStampGivenDate?.(reactiveDate.date)
  const currentPeriodStamp = store.getters.periodStampGivenDate?.(new Date())
  if (rememberedPeriodStamp !== currentPeriodStamp) {
    reactiveDate.date = new Date()
  }
}, 60 * 1000)

sbp('sbp/selectors/register', {
  // 'state' is the Vuex state object, and it can only store JSON-like data
  'state/vuex/state': () => store.state,
  'state/vuex/reset': () => {
    const state = cloneDeep(initialState)
    state.notifications = notificationModule.state()
    state.settings = settingsModule.state()
    state.chatroom = chatroomModule.state()
    state.idleVue = { isIdle: false }
    store.replaceState(state)
  },
  'state/vuex/replace': (state) => store.replaceState(state),
  'state/vuex/commit': (id, payload) => store.commit(id, payload),
  'state/vuex/getters': () => store.getters,
  'state/vuex/settings': () => store.state.settings,
  'state/vuex/postUpgradeVerification': function (state: Object) {
    // Note: Update this function when renaming a Vuex module, or implementing a new one,
    // or adding new settings to the initialState above
    // Example:
    // if (!state.preferences) {
    //   state.preferences = {}
    // }
    if (!state.preferences) {
      state.preferences = {}
    }
    if (state.periodicNotificationAlreadyFiredMap) {
      if (!state.periodicNotificationAlreadyFiredMap.alreadyFired) {
        state.periodicNotificationAlreadyFiredMap.alreadyFired = Object.create(null)
      }
      if (!state.periodicNotificationAlreadyFiredMap.lastRun) {
        state.periodicNotificationAlreadyFiredMap.lastRun = Object.create(null)
      }
    }

    // Fix missing `namespaceLookups`. See issue
    // Promise.resolve to coerce into a promise, making `then` safe
    Promise.resolve(sbp('chelonia/rootState')).then((state) => {
      if (state.namespaceLookups) return

      const identityContractIDs = Object.entries(state.contracts)
        // $FlowFixMe[incompatible-use]
        .filter(([, { type }]) => type === 'gi.contracts/identity')
        .map(([id]) => id)
      console.info('Fixing missing lookup entries', identityContractIDs)

      return Promise.all(identityContractIDs.map((id) => {
        const username = state[id].attributes?.username
        if (!username) return undefined
        return sbp('namespace/lookup', username, { skipCache: true })
      })).catch(e => {
        console.error('[state/vuex/postUpgradeVerification] Error during lookup', e)
      })
    })
  },
  'state/vuex/save': (encrypted: ?boolean, state: ?Object) => {
    return sbp('okTurtles.eventQueue/queueEvent', 'state/vuex/save', async function () {
      state = state || store.state
      // IMPORTANT! DO NOT CALL VUEX commit() in here in any way shape or form!
      //            Doing so will cause an infinite loop because of store.subscribe below!
      if (!state.loggedIn) {
        return
      }

      const { identityContractID, encryptionParams } = state.loggedIn
      state.notifications.items = applyStorageRules(state.notifications.items || [], state.notifications.status || {})
      if (encrypted) {
        await sbp('gi.db/settings/saveEncrypted', identityContractID, state, encryptionParams)
      } else {
        await sbp('gi.db/settings/save', identityContractID, state)
      }
    })
  }
})

// Mutations must be synchronous! Never call these directly, instead use commit()
// http://vuex.vuejs.org/en/mutations.html
const mutations = {
  login (state, user) {
    state.loggedIn = user
  },
  // isNewlyCreated will force a redirect to /pending-approval
  // forceRefresh will force a redirect to / (this is useful for closing
  // the modal when leaving a group; usually, it's not needed and should be
  // false)
  setCurrentGroupId (state, { contractID: currentGroupId, forceRefresh, isNewlyCreated }) {
    // TODO: unsubscribe from events for all members who are not in this group
    Vue.set(state, 'currentGroupId', currentGroupId)
    if (!currentGroupId || forceRefresh) {
      // If we're joining a group, we should not react to group membership
      // changes. Instead, we should remain where we are until the join process
      // is complete.
      if (sbp('controller/router').history.current.path === '/join') return
      sbp('controller/router').push({ path: '/' }).catch(() => {})
    } else if (isNewlyCreated) {
      sbp('controller/router').push({ path: '/pending-approval' }).catch(() => {})
    }
  },
  setPreferences (state, value) {
    Vue.set(state, 'preferences', value)
  },
  setLastLoggedIn (state, [groupID, value]) {
    Vue.set(state.lastLoggedIn, groupID, value)
  },
  // Since Chelonia directly modifies contract state without using 'commit', we
  // need this hack to tell the vuex developer tool it needs to refresh the state
  noop () {}
}

const store: any = new Vuex.Store({
  state: cloneDeep(initialState),
  mutations,
  getters: {
    ...getters,
    // this getter gets recomputed automatically according to the setInterval on reactiveDate
    currentPaymentPeriodForGroup (state, getters) {
      return (state) => getters.periodStampGivenDateForGroup(state, reactiveDate.date)
    },
    currentPaymentPeriod (state, getters) {
      return getters.currentPaymentPeriodForGroup(getters.currentGroupState)
    }
  },
  modules: {
    notifications: notificationModule,
    settings: settingsModule,
    chatroom: chatroomModule
  },
  strict: false // we're intentionally modifying state outside of commits
})

// Somewhat of a hack, I'm not sure why this is necessary now, but ever since changing how
// getters.currentPaymentPeriod works, this is necessary to force the UI to update immediately
// after a payment is made.
store.watch(function (state, getters) {
  return getters.currentGroupState.settings?.distributionDate
}, function () {
  reactiveDate.date = new Date()
})

// save the state each time it's modified, but debounce it to avoid saving too frequently
let logoutInProgress = false
const debouncedSave = debounce(() => !logoutInProgress && sbp('state/vuex/save'), 500)
store.subscribe((commit) => {
  if (commit.type !== 'noop') {
    debouncedSave()
  }
}) // for e.g saving notifications that are markedAsRead
// since Chelonia updates do not pass through calls to 'commit', also save upon EVENT_HANDLED
sbp('okTurtles.events/on', EVENT_HANDLED, debouncedSave)
// logout will call 'state/vuex/save', so we clear any debounced calls to it before it gets run
sbp('sbp/filters/selector/add', 'gi.app/identity/logout', function () {
  logoutInProgress = true
  debouncedSave.clear()
})
sbp('okTurtles.events/on', LOGOUT, () => { logoutInProgress = false })
// Since Chelonia directly modifies contract state without using 'commit', we
// need this hack to tell the vuex developer tool it needs to refresh the state
if (process.env.NODE_ENV === 'development') {
  sbp('okTurtles.events/on', EVENT_HANDLED, debounce(() => {
    store.commit('noop')
  }, 500))
}

sbp('okTurtles.events/on', CONTRACT_REGISTERED, async (contract) => {
  const { contracts: { manifests } } = await sbp('chelonia/config')
  // check to make sure we're only loading the getters for the version of the contract
  // that this build of GI was compiled with
  if (manifests[contract.name] === contract.manifest) {
    if (contract.name === 'gi.contracts/group') {
      store.watch(
        (state, getters) => getters.currentPaymentPeriod,
        (newPeriod, oldPeriod) => {
          // This watcher is for automatically syncing 'currentPaymentPeriod' with 'groupSettings.distributionDate'.
          // Before bringing this logic in, how the app updates the state related to group distribution period was,
          // 'currentPaymentPeriod': gets auto-updated(t1) in response to the change of 'reactiveDate.date' when it passes into the new period.
          // 'groupSettings.distributionDate': gets updated manually by calling 'updateCurrentDistribution' function(t2) in group.js
          // This logic removes the inconsistency that exists between these two from the point of time t1 till t2.

          // Note: if this code gets called when we're in the period before the 1st distribution
          //       period, then the distributionDate will get updated to the previous distribution date
          //       (incorrectly). That in turn will cause the Payments page to update and display TODOs
          //       before it should.
          // NOTE: `distributionStarted` allows distributionDate can be updated automatically ONLY after
          //       the distribution is started. And it fixes the issue mentioned above.
          const distributionDateInSettings = store.getters.groupSettings.distributionDate
          const distributionStarted = store.getters.groupDistributionStarted(reactiveDate.date)
          if (oldPeriod && newPeriod && distributionStarted && (newPeriod !== distributionDateInSettings)) {
            sbp('gi.actions/group/updateDistributionDate', { contractID: store.state.currentGroupId })
              .catch((e) => {
                console.error('okTurtles.events/on CONTRACT_REGISTERED Error calling updateDistributionDate', e)
              })
          }
        }
      )
    }
  }
})

export default store
