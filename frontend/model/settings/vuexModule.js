'use strict'

import sbp from '@sbp/sbp'

import Colors from './colors.js'
import { SET_APP_LOGS_FILTER } from '@utils/events.js'
import { cloneDeep } from '~/frontend/model/contracts/shared/giLodash.js'
import { THEME_LIGHT, THEME_DARK } from './themes.js'

const checkSystemColor = () => {
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches
    ? THEME_DARK
    : THEME_LIGHT
}

const defaultTheme = 'system'
const defaultColor: string = checkSystemColor()

export const defaultSettings = {
  appLogsFilter: (((process.env.NODE_ENV === 'development' || new URLSearchParams(window.location.search).get('debug'))
    ? ['error', 'warn', 'info', 'debug', 'log']
    : ['error', 'warn', 'info']): string[]),
  fontSize: 16,
  increasedContrast: false,
  notificationEnabled: true,

  reducedMotion: false,
  theme: defaultTheme,
  themeColor: defaultColor
}

const getters = {
  colors (state) {
    return Colors[state.themeColor]
  },
  fontSize (state) {
    return state.fontSize
  },
  isDarkTheme (state) {
    return state.themeColor === THEME_DARK
  },
  theme (state) {
    return state.theme
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
  setNotificationEnabled (state, enabled) {
    state.notificationEnabled = enabled
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
  setTheme (state, theme) {
    state.theme = theme
    state.themeColor = theme === 'system' ? checkSystemColor() : theme
  }
}

export default ({
  state: () => cloneDeep(defaultSettings),
  getters,
  mutations
}: Object)
