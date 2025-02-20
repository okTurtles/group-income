'use strict'

import sbp from '@sbp/sbp'
import { L } from '@common/common.js'
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
  notificationEnabled: null, // 3 values: null (unset), true (user-enabled), false (user-disabled)
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
    console.info('[setNotificationEnabled] set to:', enabled)
    state.notificationEnabled = enabled
    // if necessary, prevents the service working from ignoring our notificationEnabled
    // setting (which is not stored in the SW because it's Vuex-only) from requesting push
    // notifications upon reconnecting to server
    sbp('chelonia/configure', { disableNotifications: !enabled }).catch(e => {
      console.error(`Error configuring Chelonia for push (enabled=${enabled}): ${e.message}`)
    })
    // We do this call to `service-worker` here to avoid DRY violations.
    // The intent is creating a subscription if none exists and letting the
    // server know of the subscription.
    // Additionally, we call this regardless of whether or not `enabled` is equal
    // to `state.notificationEnabled` before this function was called, just to
    // increase the likelihood that the server gets the latest and most correct
    // push URL for us.
    sbp('service-worker/setup-push-subscription').catch(e => {
      console.error('[setNotificationEnabled] Error calling service-worker/setup-push-subscription', e)
      alert(L(`There was a problem setting push notifications: ${e.message}`))
    })
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
