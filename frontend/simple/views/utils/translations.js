import i18next from 'i18next'
import XHR from 'i18next-xhr-backend'
import Vue from 'vue'
import I18n from '../components/i18n.vue'
import template from '../../utils/string-template.js'

i18next.use(XHR)
// Initialize language to browser language
// Set backend to xhr
i18next.init(i18next.init({
  lng: /^en-/.test(navigator.language) ? 'en' : navigator.language,
  defaultValue: 'en',
  fallbackLng: 'en',
  backend: {
    loadPath: '/simple/assets/locales/{{lng}}/{{ns}}.json',
    allowMultiLoading: false
  }
}))
// create vue plugin to provide i18n component

var translation = {}
translation.install = function (Vue, options) {
  Vue.component('i18n', I18n)
  Vue.prototype.L = L
}
Vue.use(translation)

export default function L (
  key: string,
  args: Array<*> | Object,
  comments: ?Object,
  options: ?Object
) {
  if (typeof args === 'string') {
    comments = args
    args = []
  }
  if (typeof comments === 'object') {
    options = comments
  }
  return template(i18next.t(key, options), args)
}
