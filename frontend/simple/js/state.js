'use strict'

// This file handles application-level state (as opposed to component-level
// state) per: http://vuex.vuejs.org/en/intro.html

import Vue from 'vue'
import Vuex from 'vuex'
import EventLog from './event-log'
import {makeLog} from '../../../shared/functions'
import {EVENT_TYPE} from '../../../shared/constants'
const {SUCCESS, ERROR} = EVENT_TYPE

Vue.use(Vuex)

// TODO: save only relevant state to localforage
const state = {
  currentGroupLog: null,
  availableGroups: [],
  // TODO: this should be managed by Keychain, not here
  loggedInUser: null,
  offset: [],
  socket: null
}

// Mutations must be synchronous! Never call these directly!
// http://vuex.vuejs.org/en/mutations.html
const mutations = {
  login (state, user) { state.loggedInUser = user },
  logout (state) { state.loggedInUser = null },
  updateCurrentGroupLog (state, log) {
    if (log.offsetPush) {
      state.offset.push(state.currentGroupLog.currentLogPosition)
      state.currentGroupLog = log.log
    } else if (log.offsetPop) {
      state.offset.pop()
      state.currentGroupLog = log.log
    } else {
      state.currentGroupLog = log
    }
  },
  addAvailableGroup (state, available) {
    if (!state.availableGroups.find((grp) => grp === available)) {
      state.availableGroups.push(available)
    }
  },
  removeAvailableGroup (state, available) {
    let index = state.availableGroups.findIndex((grp) => grp === available)
    if (index) {
      state.availableGroups.splice(index, 1)
    }
  },
  clearAvailableGroups (state, available) {
    state.availableGroups = []
  },
  updateSocket (state, socket) {
    state.socket = socket
  }
}

export const actions = {
  async createGroup ({commit, state}, group) {
    let log = await EventLog.createEventLogFromGroup(group)
    if (state.socket) {
      await joinRoom(state.socket, group)
    }
    commit('updateCurrentGroupLog', log)
    commit('addAvailableGroup', log.groupId)
  },
  // TODO: Connect this to user credentials
  // limits to available groups for user
  async loadGroup ({commit, state}, group) {
    let available = state.availableGroups
    if (available.find((grp) => { return group === grp })) {
      if (state.socket) {
        await joinRoom(state.socket, group)
      }
      let log = await EventLog.getEventLogForGroupId(group)
      let offset = []
      commit('updateCurrentGroupLog', {log, offset})
    }
  },
  async appendLog ({commit, state}, event) {
    let log = await EventLog.addItemToLog(state.currentGroupLog, event)
    commit('updateCurrentGroupLog', log)
  },
  async receiveEvent ({commit, state}, msg) {
    // check if this is a log update
    if (msg.data && msg.data.entry && msg.data.entry.parentHash) {
      let available = state.availableGroups
      // check to see if this event is for an available group
      if (available.find((grp) => { return msg.data.groupId === grp })) {
        let log = await EventLog.getEventLogForGroupId(msg.data.groupId)
        log = await EventLog.addItemToLog(log, msg.data.entry.data, true)
        // update current if the event is for the current group
        if (state.currentGroupLog && state.currentGroupLog.currentLogPosition === msg.data.groupId) {
          commit('updateCurrentGroupLog', log)
        }
      }
    }
  },
  async backward ({commit, state}) {
    if (state.currentGroupLog) {
      let entry = await EventLog.getItemFromLog(state.currentGroupLog, state.currentGroupLog.currentLogPosition)
      let log = makeLog(state.currentGroupLog.groupId, entry.parentHash)
      commit('updateCurrentGroupLog', {log, offsetPush: true})
    }
  },
  async forward ({commit, state}) {
    if (state.currentGroupLog && state.offset.length) {
      let prior = state.offset[state.offset.length - 1]
      let log = makeLog(state.currentGroupLog.groupId, prior)
      commit('updateCurrentGroupLog', {log, offsetPop: true})
    }
  },
  login ({commit, state}, user) {
    if (state.loggedInUser) {
      return
    }
    // TODO: Create a loop for join rooms for the available groups of the logged in user
    commit('login', user)
  },
  async logout ({commit, state}) {
    if (!state.loggedInUser) {
      return
    }
    // leave the rooms joined by the user
    let available = state.availableGroups
    for (let i = 0; i < available.length; i++) {
      let room = available[i]
      await leaveRoom(state.socket, room)
    }
    commit('logout')
    commit('logout')
  },
  async stateTest ({commit, state}) {
    let available = state.availableGroups
    available.push('group')
    console.log('')
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

function joinRoom (socket, room) {
  return new Promise((resolve, reject) => {
    socket.writeAndWait({action: 'join', room}, function (response) {
      if (response.event === SUCCESS) {
        resolve(response)
      } else {
        reject(new Error(`Failed to join ${room}`))
      }
    })
  })
}

function leaveRoom (socket, room) {
  return new Promise((resolve) => {
    socket.writeAndWait({action: 'leave', room}, function (response) {
      if (response.event === ERROR) {
        console.log(response)
      }
      resolve(response) // not critical if this fails
    })
  })
}
