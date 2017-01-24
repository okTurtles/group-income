'use strict'

// This file handles application-level state (as opposed to component-level
// state) per: http://vuex.vuejs.org/en/intro.html

import Vue from 'vue'
import Vuex from 'vuex'
import EventLog from './event-log'
import {EVENT_TYPE} from '../../../shared/constants'
import userSession from './user-session'
const {SUCCESS, ERROR} = EVENT_TYPE

Vue.use(Vuex)

// TODO: save only relevant state to localforage
const state = {
  currentLogPosition: null,
  // TODO: this should be managed by Keychain, not here
  loggedInUser: null,
  offset: [],
  socket: null
}

// Mutations must be synchronous! Never call these directly!
// http://vuex.vuejs.org/en/mutations.html
const mutations = {
  login (state, userHashKey) { state.loggedInUser = userHashKey },
  logout (state) { state.loggedInUser = null },
  updateCurrentLogPosition (state, currentLogPosition) {
    if (currentLogPosition.offsetPush) {
      state.offset.push(state.currentLogPosition)
      state.currentLogPosition = currentLogPosition.currentLogPosition
    } else if (currentLogPosition.offsetPop) {
      state.offset.pop()
      state.currentLogPosition = currentLogPosition.currentLogPosition
    } else {
      state.currentLogPosition = currentLogPosition
      state.offset = []
    }
  },
  updateSocket (state, socket) {
    state.socket = socket
  }
}

export const actions = {
  async createGroup ({commit, state}, group) {
    let groupId = await EventLog.createEventLogFromGroup(group)
    if (state.socket) {
      await joinRoom(state.socket, groupId)
    }
    commit('updateCurrentLogPosition', groupId)
  },
  // TODO: Connect this to user credentials
  // limits to available groups for user
  async loadGroup ({commit, state}, groupId) {
    await userSession.setCurrentGroup(state.loggedInUser, groupId)
    if (state.socket) {
      await joinRoom(state.socket, groupId)
    }
    let currentLogPosition = await EventLog.getCurrentLogPositionForGroup(groupId)
    commit('updateCurrentLogPosition', currentLogPosition)
  },
  async appendLog ({commit, state}, event) {
    let currentLogPosition = await EventLog.addItemToLog(event)
    commit('updateCurrentLogPosition', currentLogPosition)
  },
  async receiveEvent ({commit, state}, msg) {
    if (msg.data && msg.data.entry && msg.data.entry.parentHash) {
      let session = await userSession.getSession(state.loggedInUser)
      let available = session.availableGroups
      // TODO Add checks that confirms current entry is the parent of the new event
      // and respond to the case where updates are missing
      // check to see if this event is for an available group
      if (available.find((grp) => { return msg.data.groupId === grp })) {
        let currentLogPosition = await EventLog.updateLogFromServer(msg.data.groupId, msg.data.entry.data)
        // update current if the event is for the current group
        if (session.currentGroup === msg.data.groupId) {
          commit('updateCurrentLogPosition', currentLogPosition)
        }
      }
    }
  },
  async backward ({commit, state}) {
    if (state.currentLogPosition) {
      let entry = await EventLog.getItemFromLog(state.currentLogPosition)
      let currentLogPosition = entry.parentHash
      commit('updateCurrentLogPosition', {currentLogPosition, offsetPush: true})
    }
  },
  async forward ({commit, state}) {
    if (state.offset.length) {
      let currentLogPosition = state.offset[state.offset.length - 1]
      commit('updateCurrentLogPosition', {currentLogPosition, offsetPop: true})
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
  },
  async createUser ({commit, state}, user) {
    // TODO Create a real user creation
    if (state.loggedInUser) {
      return
    }
    let userHashKey = '2XbExTFJy4MqcgJP32MFc4VgV1HSa5dD9naF99MvR4LB'
    await userSession.createSession(userHashKey)
    commit('login', userHashKey)
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
