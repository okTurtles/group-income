'use strict'

import sbp from '@sbp/sbp'

import Colors from './colors.js'
import { LOGOUT, SET_APP_LOGS_FILTER, THEME_CHANGE } from '@utils/events.js'
import { cloneDeep } from '~/frontend/model/contracts/shared/giLodash.js'
import { THEME_LIGHT, THEME_DARK } from './themes.js'

const checkSystemColor = () => {
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches
    ? THEME_DARK
    : THEME_LIGHT
}

const updateMetaThemeTag = (theme: string) => {
  // update the content of <meta name='theme-color' /> according to the changed theme
  const metaTag: any = document.querySelector('meta[name="theme-color"]')

  if (metaTag) {
    metaTag.content = theme === THEME_DARK ? '#2E3032' : '#F5F5F5'
  }
}

const defaultTheme = 'system'
const defaultColor: string = checkSystemColor()

export const defaultSettings = {
  appLogsFilter: (((process.env.NODE_ENV === 'development' || new URLSearchParams(location.search).get('debug'))
    ? ['error', 'warn', 'info', 'debug', 'log']
    : ['error', 'warn', 'info']): string[]),
  fontSize: 16,
  increasedContrast: false,
  notificationEnabled: false,
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
  isReducedMotionMode (state) {
    return state.reducedMotion === true
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
    if (state.notificationEnabled !== enabled) {
      // We do this call to `service-worker` here to avoid DRY violations.
      // The intent is creating a subscription if none exists and letting the
      // server know of the subscription
      sbp('service-worker/setup-push-subscription').catch(e => {
        // The parent `if` branch should prevent infinite loops
        sbp('state/vuex/commit', 'setNotificationEnabled', false)
        console.error('[setNotificationEnabled] Error calling service-worker/setup-push-subscription', e)
      })
    }
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

    const themeColor = theme === 'system' ? checkSystemColor() : theme
    state.themeColor = themeColor
    sbp('okTurtles.events/emit', THEME_CHANGE, themeColor)
  }
}

// Default application settings must apply again when we're no longer logged in (#1344).
sbp('okTurtles.events/on', LOGOUT, () => sbp('state/vuex/commit', 'resetSettings'))

// make sure to set the status bar color according to the theme setting change.
sbp('okTurtles.events/on', THEME_CHANGE, updateMetaThemeTag)

export default ({
  state: () => cloneDeep(defaultSettings),
  getters,
  mutations
}: Object)
