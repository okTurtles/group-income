'use strict'

import sbp from '@sbp/sbp'

import Colors from '@model/colors.js'
import { LOGOUT, SET_APP_LOGS_FILTER } from '@utils/events.js'
import { cloneDeep } from '@utils/giLodash.js'
import { THEME_LIGHT, THEME_DARK } from '@utils/themes.js'

let defaultTheme = THEME_LIGHT
if (typeof (window) !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
  defaultTheme = THEME_DARK
}

export const defaultSettings = {
  appLogsFilter: process.env.NODE_ENV === 'development'
    ? ['error', 'warn', 'info', 'debug', 'log']
    : ['error', 'warn', 'info'],
  fontSize: 16,
  increasedContrast: false,
  reducedMotion: false,
  theme: defaultTheme
}

const getters = {
  colors (state) {
    return Colors[state.theme]
  },
  fontSize (state) {
    return state.fontSize
  },
  isDarkTheme (state) {
    return Colors[state.theme].theme === THEME_DARK
  }
}

const mutations = {
  resetSettings (state) {
    Object.assign(state, cloneDeep(defaultSettings))
  },
  setAppLogsFilter (state, filter) {
    state.appLogsFilter = filter
    sbp('okTurtles.events/emit', SET_APP_LOGS_FILTER, filter)
  },
  setFontSize (state, fontSize) {
    state.fontSize = fontSize
  },
  setIncreasedContrast (state, isChecked) {
    state.increasedContrast = isChecked
  },
  setReducedMotion (state, isChecked) {
    state.reducedMotion = isChecked
  },
  setTemporaryReducedMotion (state) {
    const tempSettings = state.reducedMotion
    state.reducedMotion = true
    setTimeout(() => {
      state.reducedMotion = tempSettings
    }, 300)
  },
  setTheme (state, color) {
    state.theme = color
  }
}

// Default application settings must apply again when we're no longer logged in (#1344).
sbp('okTurtles.events/on', LOGOUT, () => sbp('state/vuex/commit', 'resetSettings'))

export default ({
  state: () => cloneDeep(defaultSettings),
  getters,
  mutations
}: Object)
