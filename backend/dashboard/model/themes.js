import store from './state.js'

const common = {
  black: '#000000',
  white: '#FFFFFF',
  text_black: '#1C1C1C',
  primary_blue: '#E3F5FF',
  primary_purple: '#E5ECF6',
  primary_green: '#E1F7EF',
  secondary_purple_0: '#95A4FC',
  secondary_purple_1: '#C6C7F8',
  secondary_purple_2: '#7476f2',
  secondary_blue_0: '#A8C5DA',
  secondary_blue_1: '#B1E3FF',
  secondary_blue_2: '#6EC7FA',
  secondary_green_0: '#A1E3CB',
  secondary_green_1: '#BAEDBD',
  secondary_green_2: '#7ce683',
  warning: '#FFE999',
  warning_1: '#fccd21',
  warning_bg: 'rgba(255, 233, 153, 0.4)',
  danger: '#FF4747',
  danger_bg: 'rgba(255, 71, 71, 0.2)'
}

const light = {
  ...common,
  background_0: '#F7F9FB',
  background_1: '#FFFFFF',
  background_active: 'rgba(0, 0, 0, 0.05)',
  text_0: '#1C1C1C',
  text_1: 'rgba(0, 0, 0, 0.4)',
  border: 'rgba(0, 0, 0, 0.1)',
  emphasis: 'rgba(0, 0, 0, 0.65)',
  helper: '#9747FF'
}

const dark = {
  ...common,
  background_0: '#1C1C1C',
  background_1: 'rgba(255, 255, 255, 0.05)',
  background_active: 'rgba(255, 255, 255, 0.1)',
  text_0: '#FFFFFF',
  text_1: 'rgba(255, 255, 255, 0.45)',
  border: 'rgba(255, 255, 255, 0.15)',
  emphasis: '#C6C7F8',
  helper: '#9747FF',
  warning_bg: 'rgba(255, 233, 153, 0.2)'
}

const THEME_STORAGE_KEY = 'chelonia-dashboard-theme'
export const THEME_LIGHT = 'light'
export const THEME_DARK = 'dark'
export const checkSystemTheme = () => {
  return window.matchMedia('(prefers-color-scheme: dark)').matches
    ? THEME_DARK
    : THEME_LIGHT
}
export const initTheme = () => {
  // check if there is a value in local-storage that was stored from user previously toggling the theme in the app.
  // if not, fallback to system preference, and lastly default to light-theme in case of no system preference in the browser.
  const fromStorage = window.localStorage.getItem(THEME_STORAGE_KEY)
  store.commit('setTheme', fromStorage || checkSystemTheme())
}
export const storeThemeToLocalStorage = (theme) => {
  window.localStorage.setItem(THEME_STORAGE_KEY, theme)
}

export default {
  light,
  dark
}
