'use strict'

// This file handles application-level state (as opposed to component-level
// state) per: http://vuex.vuejs.org/en/intro.html

import Vue from 'vue'
import Vuex from 'vuex'
import EventLog from './event-log'
import localforage from 'localforage'
import _ from 'lodash-es'
import {makeUserSession, makeLog} from '../../../shared/functions'
import {EVENT_TYPE} from '../../../shared/constants'
const {ERROR} = EVENT_TYPE

import type {Entry} from '../../../shared/types'

Vue.use(Vuex)

// persistent store of the state between online sessions
const settings = localforage.createInstance({name: 'Group Income', storeName: 'Settings'})
function saveSettings () { settings.setItem(state.loggedInUser, state.settings) }
const saveSettingsDebounced = _.debounce(saveSettings, 500, {maxWait: 5000})

// This is the Vuex state object
const state = {
  settings: {},
  // TODO: this should be managed by Keychain, not here
  loggedInUser: null,
  socket: null
}

// Mutations must be synchronous! Never call these directly!
// http://vuex.vuejs.org/en/mutations.html
const mutations = {
  login (state, userHashKey) { state.loggedInUser = userHashKey },
  logout (state) { state.loggedInUser = null },
  updateSession (state, session) { state.settings = session },
  updateSocket (state, socket) { state.socket = socket },
  updateCurrentLogPosition (state, currentLogPosition) {
    if (currentLogPosition.offsetPush) {
      state.settings.offset.push(state.settings.currentGroup.currentLogPosition)
      state.settings.currentGroup.currentLogPosition = currentLogPosition.currentLogPosition
    } else if (currentLogPosition.offsetPop) {
      state.settings.offset.pop()
      state.settings.currentGroup.currentLogPosition = currentLogPosition.currentLogPosition
    } else {
      state.settings.currentGroup.currentLogPosition = currentLogPosition
      state.settings.offset = []
    }
  },
  addAvailableGroup (state, available) {
    if (!state.settings.availableGroups.find((grp) => grp === available)) {
      state.settings.availableGroups.push(available)
    }
  },
  removeAvailableGroup (state, available) {
    let index = state.settings.availableGroups.findIndex((grp) => grp === available)
    if (index > -1) {
      state.settings.availableGroups.splice(index, 1)
    }
  },
  setCurrentGroup (state, group) {
    if (state.settings.availableGroups.find((grp) => grp === group.groupId)) {
      state.settings.currentGroup = group
    }
  }
}

export const actions = {
  // TODO: This should *visually* create a group. That hasn't been implemented yet.
  //       And it should be renamed to "groupCreated" or something like that, because
  //       the way that groups are created is an event is sent via the RESTful API
  //       to the server, and then the server responds over pubsub with an echo
  //       of the same exact event that we just sent to the RESTful API. This tells
  //       us that the server has successfully saved it to its database, so therefore
  //       it's OK for us to save it to ours, and that is done again, just like on the
  //       server, as simply adding an entry to the log, e.g. here via appendLog.
  //
  //       So there needs to be somewhere a big switch statement that *interprets*
  //       the types of events that are added to the log, and updates the UI accordingly.
  //       But either way, this 'createGroup' function has got to go.
  async createGroup ({commit, state}, group) {
    // let groupId = await EventLog.createEventLogFromGroup(group)
    commit('addAvailableGroup', groupId)
    commit('setCurrentGroup', makeLog(groupId, groupId))
    saveSettingsDebounced()
    // TODO: joining the room should be moved out of here because this function is
    //       'createGroup', not 'createGroupAndJoinRoom'. Also because these actions
    //       have a single expected purpose: updating the Vuex state, and that's it.
    state.socket && await joinRoom(state.socket, groupId)
  },
  async appendLog ({commit, state}, hash: string, entry: Entry) {
    var groupId = state.settings.currentGroup.groupId
    await EventLog.addLogEntry(groupId, hash, entry)
    commit('updateCurrentLogPosition', hash)
    console.log('happened') // TODO: add better logging
  },
  async backward ({commit, state}) {
    // TODO: if an if can fail, it must be error checked. Same goes for everywhere
    //       else in this file where there's an 'if'.
    if (state.settings.currentGroup) {
      let groupId = state.settings.currentGroup.groupId
      let hash = state.settings.currentGroup.currentLogPosition
      let entry = await EventLog.getLogEntry(groupId, hash)
      let currentLogPosition = entry.parentHash
      commit('updateCurrentLogPosition', {currentLogPosition, offsetPush: true})
      saveSettingsDebounced()
    }
  },
  forward ({commit, state}) {
    if (state.settings.offset.length) {
      let currentLogPosition = state.settings.offset[state.settings.offset.length - 1]
      commit('updateCurrentLogPosition', {currentLogPosition, offsetPop: true})
      saveSettingsDebounced()
    }
  },
  async login ({commit, state}, user) {
    if (state.loggedInUser) {
      return
    }
    commit('login', user)
    let session = await settings.getItem(state.loggedInUser)
    commit('updateSession', session)
    let available = state.settings.availableGroups
    for (let i = 0; i < available.length; i++) {
      let room = available[i]
      await joinRoom(state.socket, room)
    }
  },
  async logout ({commit, state}) {
    if (!state.loggedInUser) {
      return
    }
    await settings.setItem(state.loggedInUser, state.settings)
    // leave the rooms joined by the user
    let available = state.settings.availableGroups
    for (let i = 0; i < available.length; i++) {
      let room = available[i]
      await leaveRoom(state.socket, room)
    }
    commit('updateSession', null)
    commit('logout')
    saveSettings(state)
  },
  async createUser ({commit, state}, user) {
    // TODO Create a real user creation
    if (state.loggedInUser) {
      return
    }
    let userHashKey = '2XbExTFJy4MqcgJP32MFc4VgV1HSa5dD9naF99MvR4LB'
    let session = makeUserSession()
    await settings.setItem(userHashKey, session)
    commit('login', userHashKey)
    commit('updateSession', session)
  }
}

// =======================
// Exports
// =======================

export const types = Object.keys(mutations)

// create the store
export default new Vuex.Store({state, mutations, actions})

// =======================
// Helpers
// =======================

// TODO: maybe it makes more sense to move these into pubsub.js?
function joinRoom (socket, room) {
  return new Promise((resolve, reject) => {
    socket.writeAndWait({action: 'join', room}, function (response) {
      (response.event === ERROR ? reject : resolve)(response)
    })
  })
}

function leaveRoom (socket, room) {
  return new Promise((resolve, reject) => {
    socket.writeAndWait({action: 'leave', room}, function (response) {
      (response.event === ERROR ? reject : resolve)(response)
    })
  })
}
