'use strict'

// This file handles application-level state (as opposed to component-level
// state) per: http://vuex.vuejs.org/en/intro.html

import sbp from '@sbp/sbp'
import { EVENT_HANDLED, CONTRACT_REGISTERED } from '~/shared/domains/chelonia/events.js'
import { LOGOUT } from '~/frontend/utils/events.js'
import Vue from 'vue'
import Vuex from 'vuex'
import { PROFILE_STATUS } from '@model/contracts/shared/constants.js'
import { cloneDeep, debounce } from '@model/contracts/shared/giLodash.js'
import { applyStorageRules } from '~/frontend/model/notifications/utils.js'
import getters from './getters.js'

// Vuex modules.
import notificationModule from '~/frontend/model/notifications/vuexModule.js'
import settingsModule from '~/frontend/model/settings/vuexModule.js'
import chatroomModule from '~/frontend/model/chatroom/vuexModule.js'

Vue.use(Vuex)

const initialState = {
  currentGroupId: null,
  contracts: {}, // contractIDs => { type:string, HEAD:string, height:number } (for contracts we've successfully subscribed to)
  loggedIn: false, // false | { username: string, identityContractID: string }
  namespaceLookups: Object.create(null), // { [username]: sbp('namespace/lookup') }
  reverseNamespaceLookups: Object.create(null), // { [contractID]: username }
  periodicNotificationAlreadyFiredMap: {}, // { notificationKey: boolean },
  contractSigningKeys: Object.create(null),
  lastLoggedIn: {}, // Group last logged in information
  preferences: {}
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
    if (!state.reverseNamespaceLookups) {
      // $FlowFixMe[incompatible-call]
      Vue.set(state, 'reverseNamespaceLookups', Object.fromEntries(Object.entries(state.namespaceLookups).map(([k, v]: [string, string]) => [v, k])))
    }
    (() => {
      // Upgrade from version 1.0.7 to a newer version
      // The new group contract introduces a breaking change: the
      // `state[groupID].chatRooms[chatRoomID].members[memberID].joinedHeight`
      // attribute.
      // This code checks if the attribute is missing, and if so, issues the
      // corresponing upgrade action.
      const ourIdentityContractId = state.loggedIn?.identityContractID
      if (!ourIdentityContractId || !state[ourIdentityContractId]?.groups) return
      Object.entries(state[ourIdentityContractId].groups).map(([groupID, { hasLeft }]: [string, Object]) => {
        if (hasLeft || !state[groupID]?.chatRooms) return undefined
        // $FlowFixMe[incompatible-use]
        return Object.values((state[groupID].chatRooms: { [string]: Object })).flatMap(({ members }) => {
          return Object.values(members)
        }).reduce((contractID: string | boolean, member: Object) => {
          if (contractID) return contractID
          if (member.status === PROFILE_STATUS.ACTIVE && member.joinedHeight == null) {
            return groupID
          }
          return false
        }, false)
      }).forEach((contractID) => {
        if (!contractID) return
        sbp('gi.actions/group/upgradeFrom1.0.7', { contractID }).catch(e => {
          console.error('[state/vuex/postUpgradeVerification] Error during gi.actions/group/upgradeFrom1.0.7', contractID, e)
        })
      })
    })();
    (() => {
      // Upgrade from version 1.0.8 to a newer version
      // The new chatroom contracts have an admin IDs list
      // This code checks if the attribute is missing, and if so, issues the
      // corresponing upgrade action.
      const needsUpgrade = (chatroomID) => !Array.isArray(state[chatroomID]?.attributes?.adminIDs)

      const upgradeAction = async (contractID: string, data?: Object) => {
        try {
          await sbp('gi.actions/chatroom/upgradeFrom1.0.8', { contractID, data })
        } catch (e) {
          console.error(`[state/vuex/postUpgradeVerification] Error during gi.actions/chatroom/upgradeFrom1.0.8 for ${contractID}:`, e)
        }
      }

      const ourIdentityContractId = state.loggedIn?.identityContractID
      if (!ourIdentityContractId || !state[ourIdentityContractId]) return
      if (state[ourIdentityContractId].groups) {
        // Group chatrooms
        Object.entries(state[ourIdentityContractId].groups).map(([groupID, { hasLeft }]: [string, Object]) => {
          if (hasLeft || !state[groupID]?.chatRooms || !state[groupID].groupOwnerID) return []
          // $FlowFixMe[incompatible-use]
          return Object.entries((state[groupID].chatRooms: { [string]: Object })).flatMap(([chatroomID, { members }]) => {
            return members[ourIdentityContractId]?.status === PROFILE_STATUS.ACTIVE && needsUpgrade(chatroomID) && [chatroomID, state[groupID].groupOwnerID]
          })
        }).forEach(([contractID, groupOwnerID]) => {
          if (!contractID) return
          upgradeAction(contractID, groupOwnerID)
        })
      }
      if (state[ourIdentityContractId].chatRooms) {
        // DM chatrooms
        return Object.keys((state[ourIdentityContractId].chatRooms: { [string]: Object })).map((chatroomID) => {
          return state[chatroomID]?.members[ourIdentityContractId] && needsUpgrade(chatroomID) && chatroomID
        }).forEach((contractID) => {
          if (!contractID) return
          upgradeAction(contractID)
        })
      }
    })()
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
    currentPaymentPeriod (state, getters) {
      return getters.periodStampGivenDate(reactiveDate.date)
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
