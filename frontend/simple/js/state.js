'use strict'

// This file handles application-level state (as opposed to component-level
// state) per: http://vuex.vuejs.org/en/intro.html

import Vue from 'vue'
import Vuex from 'vuex'
import EventLog from './event-log'
import {EVENT_TYPE} from '../../../shared/constants'
import {makeUserSession} from '../../../shared/functions'
import localforage from 'localforage'
import _ from 'lodash-es'
const {SUCCESS, ERROR} = EVENT_TYPE

Vue.use(Vuex)
// appSessionData is the persistent store of the state between online sessions
const appSessionData = localforage.createInstance({
  name: 'Group Income',
  storeName: 'Application Sessions'
})
// TODO: save only relevant state to localforage
const state = {
  session: null,
  // TODO: this should be managed by Keychain, not here
  loggedInUser: null,
  socket: null
}

// Mutations must be synchronous! Never call these directly!
// http://vuex.vuejs.org/en/mutations.html
const mutations = {
  login (state, userHashKey) { state.loggedInUser = userHashKey },
  logout (state) { state.loggedInUser = null },
  updateCurrentLogPosition (state, currentLogPosition) {
    if (currentLogPosition.offsetPush) {
      state.session.offset.push(state.session.currentGroup.currentLogPosition)
      state.session.currentGroup.currentLogPosition = currentLogPosition.currentLogPosition
    } else if (currentLogPosition.offsetPop) {
      state.session.offset.pop()
      state.session.currentGroup.currentLogPosition = currentLogPosition.currentLogPosition
    } else {
      state.session.currentGroup.currentLogPosition = currentLogPosition
      state.session.offset = []
    }
  },
  updateSession (state, session) {
    state.session = session
  },
  addAvailableGroup (state, available) {
    if (!state.session.availableGroups.find((grp) => grp === available)) {
      state.session.availableGroups.push(available)
    }
  },
  removeAvailableGroup (state, available) {
    let index = state.session.availableGroups.findIndex((grp) => grp === available)
    if (index > -1) {
      state.session.availableGroups.splice(index, 1)
    }
  },
  setCurrentGroup (state, group) {
    if (state.session.availableGroups.find((grp) => grp === group.groupId)) {
      state.session.currentGroup = group
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
    saveSessionDebounced(state)
  },
  async appendLog ({state}, event) {
    await EventLog.addItemToLog(event)
    saveSessionDebounced(state)
  },
  async receiveEvent ({state}, msg) {
    if (msg.data && msg.data.entry && msg.data.entry.parentHash) {
      let available = state.session.availableGroups
      // TODO Add checks that confirms current entry is the parent of the new event
      // and respond to the case where updates are missing
      // check to see if this event is for an available group
      if (available.find((grp) => { return msg.data.groupId === grp })) {
        await EventLog.updateLogFromServer(msg.data.groupId, msg.data.entry.data)
        saveSessionDebounced(state)
      }
    }
  },
  async backward ({commit, state}) {
    if (state.session.currentGroup) {
      let entry = await EventLog.getItemFromLog(state.session.currentGroup.currentLogPosition)
      let currentLogPosition = entry.parentHash
      commit('updateCurrentLogPosition', {currentLogPosition, offsetPush: true})
      saveSessionDebounced(state)
    }
  },
  forward ({commit, state}) {
    if (state.session.offset.length) {
      let currentLogPosition = state.session.offset[state.session.offset.length - 1]
      commit('updateCurrentLogPosition', {currentLogPosition, offsetPop: true})
      saveSessionDebounced(state)
    }
  },
  async login ({commit, state}, user) {
    if (state.loggedInUser) {
      return
    }
    commit('login', user)
    let session = await appSessionData.getItem(state.loggedInUser)
    commit('updateSession', session)
    let available = state.session.availableGroups
    for (let i = 0; i < available.length; i++) {
      let room = available[i]
      await joinRoom(state.socket, room)
    }
  },
  async logout ({commit, state}) {
    if (!state.loggedInUser) {
      return
    }
    await appSessionData.setItem(state.loggedInUser, state.session)
    // leave the rooms joined by the user
    let available = state.session.availableGroups
    for (let i = 0; i < available.length; i++) {
      let room = available[i]
      await leaveRoom(state.socket, room)
    }
    commit('updateSession', null)
    commit('logout')
    saveSession(state)
  },
  async createUser ({commit, state}, user) {
    // TODO Create a real user creation
    if (state.loggedInUser) {
      return
    }
    let userHashKey = '2XbExTFJy4MqcgJP32MFc4VgV1HSa5dD9naF99MvR4LB'
    let session = makeUserSession()
    await appSessionData.setItem(userHashKey, session)
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
async function saveSession (state) {
  if (!state.loggedInUser || !state.session) {
    return
  }
  await appSessionData.setItem(state.loggedInUser, state.session)
}
const saveSessionDebounced = _.debounce(saveSession, 500, { 'maxWait': 5000 })
