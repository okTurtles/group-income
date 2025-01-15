'use strict'

import sbp from '@sbp/sbp'
import Vue from 'vue'
import { cloneDeep } from '~/frontend/model/contracts/shared/giLodash.js'
import { NOTIFICATION_EMITTED, NOTIFICATION_REMOVED, NOTIFICATION_STATUS_LOADED } from '~/frontend/utils/events.js'
import getters from './getters.js'
import * as keys from './mutationKeys.js'
import type { Notification } from './types.flow.js'
import { compareOnTimestamp } from './utils.js'

sbp('okTurtles.events/on', NOTIFICATION_EMITTED, (notification) => {
  sbp('state/vuex/commit', keys.ADD_NOTIFICATION, notification)
})

sbp('okTurtles.events/on', NOTIFICATION_REMOVED, (hashes) => {
  hashes.forEach(hash => sbp('state/vuex/commit', keys.REMOVE_NOTIFICATION, hash))
})

sbp('okTurtles.events/on', NOTIFICATION_STATUS_LOADED, (status) => {
  sbp('state/vuex/commit', 'setNotificationStatus', status)
})

const defaultState = {
  items: [], status: {}
}

const mutations = {
  // Seems necessary because the red badge would not clear upon signing up a new user in Cypress via the bypassUI mechanism.
  logout (state) {
    Object.keys(state).forEach(key => {
      Vue.delete(state, key)
    })
    Object.assign(state, cloneDeep(defaultState))
  },

  [keys.ADD_NOTIFICATION] (state, notification: Notification) {
    if (state.items.some(item => item.hash === notification.hash)) {
      // We cannot throw here, as this code might be called from within a contract side effect.
      return console.error('[ADD_NOTIFICATION] This notification is already in the store.', notification.hash)
    }
    state.items.push(notification)
    // Sort items in chronological order, newest items first.
    state.items.sort(compareOnTimestamp)
  },

  [keys.REMOVE_NOTIFICATION] (state, hash: string) {
    const index = state.items.findIndex(item => item.hash === hash)

    if (index > -1) {
      state.items.splice(index, 1)
    }
  },

  [keys.REMOVE_ALL_NOTIFICATIONS] (state) {
    // Just setting the length to zero wouldn't update the view immediately.
    state.items.splice(0, state.items.length)
  },

  // Used upon successful login, with notifications from local storage.
  [keys.SET_NOTIFICATIONS] (state, notifications: Notification[]) {
    state.items.splice(0, state.items.length, ...notifications)
  },

  setNotificationStatus (state, status) {
    state.status = status
  }
}

export default ({
  state: () => cloneDeep(defaultState),
  getters,
  mutations
}: Object)
