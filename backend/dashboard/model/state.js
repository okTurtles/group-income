'use strict'

import sbp from '@sbp/sbp'
import Vue from 'vue'
import Vuex from 'vuex'
import Colors, { checkSystemTheme, storeThemeToLocalStorage } from './themes.js'
import { cloneDeep } from '@common/cdLodash.js'

Vue.use(Vuex)

const defaultTheme = checkSystemTheme()
const initialState = {
  theme: defaultTheme
}

const mutations = {
  setTheme (state, theme) {
    state.theme = theme
  }
}

const getters = {
  colors (state) {
    return Colors[state.theme]
  }
}

const actions = {}

const store = new Vuex.Store({
  state: cloneDeep(initialState),
  mutations,
  getters,
  actions
})

// watchers
store.watch(
  state => state.theme,
  (theme) => {
    document.documentElement.dataset.theme = theme
    storeThemeToLocalStorage(theme)
  }
)

sbp('sbp/selectors/register', {
  'state/vuex/state': () => store.state,
  'state/vuex/commit': (id, payload) => store.commit(id, payload),
  'state/vuex/getters': () => store.getters
})

export default store
