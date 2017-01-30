'use strict'

// This file handles application-level state (as opposed to component-level
// state) per: http://vuex.vuejs.org/en/intro.html

import Vue from 'vue'
import Vuex from 'vuex'
import * as db from './database'
import {ENTRY_TYPE} from '../../../shared/constants'
import type {Entry} from '../../../shared/types'

Vue.use(Vuex)

// This is the Vuex state object
const state = {
  currentGroup: {},
  offset: [],
  groups: [], // groups we're part of. This might be represented differently later
  loggedIn: false // TODO: properly handle this
}

// Mutations must be synchronous! Never call these directly!
// http://vuex.vuejs.org/en/mutations.html
const mutations = {
  logPosition (state, logPosition) {
    state.currentGroup.logPosition = logPosition
    state.offset = []
  },
  backward (state, offset) {
    state.offset.push(state.currentGroup.logPosition)
    state.currentGroup.logPosition = offset
  },
  forward (state) {
    if (state.offset.length > 0) {
      state.currentGroup.logPosition = state.offset.pop()
    }
  },
  addGroup (state, groupId) {
    state.groups.indexOf(groupId) < 0 && state.groups.push(groupId)
  },
  removeGroup (state, groupId) {
    let index = state.groups.indexOf(groupId)
    index > -1 && state.groups.splice(index, 1)
  },
  setGroups (state, groups) {
    state.groups = groups
  },
  setCurrentGroup (state, currentGroup) {
    state.currentGroup = currentGroup
    state.offset = []
  }
}

export const actions = {
  async saveState (
    {state}: {state: Object}
  ) {
    await db.saveSettings({
      groupId: state.currentGroup.groupId,
      groups: state.groups
    })
  },
  async loadState (
    {commit, state}: {state: Object}
  ) {
    let {groups, groupId} = await db.loadSettings()
    commit('setCurrentGroup', groupId, await db.recentHash(groupId))
    commit('setGroups', groups)
  },

  // this is main entry point for getting events into the log.
  // mirrors `handleEvent` in backend/server.js
  async handleEvent (
    {dispatch, commit, state}: {dispatch: Function, commit: Function, state: Object},
    {groupId, hash, entry}: {groupId: string, hash: string, entry: Entry}
  ) {
    console.log(`HANDLING EVENT for ${groupId}:`, entry) // TODO: add better logging
    await db.addLogEntry(groupId, hash, entry)
    if (entry.type === ENTRY_TYPE.CREATION) {
      commit('setCurrentGroup', {groupId, logPosition: groupId})
      commit('addGroup', groupId)
      dispatch('saveState')
    } else {
      commit('logPosition', hash)
    }
  },

  // time travel related
  async backward (
    {commit, state}: {commit: Function, state: Object}
  ) {
    if (state.currentGroup) {
      let {groupId, logPosition} = state.currentGroup
      let entry = await db.getLogEntry(groupId, logPosition)
      commit('backward', entry.parentHash)
    }
  },
  forward (
    {commit, state}: {commit: Function, state: Object}
  ) {
    state.currentGroup && commit('forward')
  }
}

export const types = Object.keys(mutations)

export default new Vuex.Store({state, mutations, actions})
