'use strict'

// This file handles application-level state (as opposed to component-level
// state) per: http://vuex.vuejs.org/en/intro.html

import Vue from 'vue'
import Vuex from 'vuex'
import * as db from './database'
import {Events} from '../../../shared/events'

Vue.use(Vuex)

export type LogState = {groupId: string | null; position: string | null;}
function makeLogState (
  groupId: string | null, position: string | null
): LogState {
  return {groupId, position}
}

// This is the Vuex state object
// Type annotation explanation: https://flowtype.org/docs/objects.html
const state: {currentGroup: LogState} = {
  currentGroup: makeLogState(null, null),
  offset: [],
  groups: [], // groups we're part of. This might be represented differently later
  loggedIn: true // TODO: properly handle this
}

// Mutations must be synchronous! Never call these directly!
// http://vuex.vuejs.org/en/mutations.html
const mutations = {
  logPosition (state, logPosition: string) {
    state.currentGroup.position = logPosition
    state.offset = []
  },
  backward (state, offset) {
    state.offset.push(state.currentGroup.position)
    state.currentGroup.position = offset
  },
  forward (state) {
    if (state.offset.length > 0) {
      state.currentGroup.position = state.offset.pop()
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
  setCurrentGroup (state, currentGroup: LogState) {
    state.currentGroup = currentGroup
    state.offset = []
  }
}

export const actions = {
  async saveSettings (
    {state}: {state: Object}
  ) {
    const settings = {
      currentGroup: state.currentGroup,
      groups: state.groups
    }
    await db.saveSettings(settings)
    console.log('saved settings:', settings)
  },
  async loadSettings (
    {commit, state}: {commit: Function, state: Object}
  ) {
    let {groups, currentGroup} = await db.loadSettings()
    console.log('loadSettings:', currentGroup, groups)
    commit('setCurrentGroup', currentGroup || makeLogState(null, null))
    commit('setGroups', groups || [])
  },

  // this function is called from ./pubsub.js and is the entry point
  // for getting events into the log.
  // mirrors `handleEvent` in backend/server.js
  async handleEvent (
    {dispatch, commit, state}: {dispatch: Function, commit: Function, state: Object},
    {groupId, hash, entry}: {groupId: string, hash: string, entry: Object}
  ) {
    console.log(`handleEvent for ${groupId}:`, entry)
    entry = Events[entry.type].fromObject(entry, hash)
    await db.addLogEntry(groupId, entry)
    // TODO: verify each entry is signed by a group member
    if (!entry.toObject().parentHash) {
      // TODO: verify we created this group before calling setCurrentGroup
      commit('setCurrentGroup', makeLogState(groupId, groupId))
      commit('addGroup', groupId)
    } else {
      commit('logPosition', hash)
    }
    dispatch('saveSettings')
  },

  // time travel related
  async backward (
    {commit, state}: {commit: Function, state: Object}
  ) {
    if (state.currentGroup) {
      let {groupId, position} = state.currentGroup
      let entry = await db.getLogEntry(groupId, position)
      commit('backward', entry.toObject().parentHash)
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
