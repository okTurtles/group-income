import i18next from 'i18next'
import XHR from 'i18next-xhr-backend'
import Vue from 'vue'
import I18n from '../components/i18n.vue'
import template from '../../utils/string-template.js'

i18next.use(XHR).init({
  load: 'languageOnly',
  fallbackLng: 'en',
  backend: {
    loadPath: '/assets/locales/{{lng}}/{{ns}}.json',
    allowMultiLoading: false
  }
}, (err) => {
  if (err) console.error('i18next setup error:', err)
})

Vue.component('i18n', I18n)
Vue.prototype.L = L

export default function L (
  key: string,
  args: Array<*> | Object | void,
  options: ?Object
) {
  // TODO: see also using i18next's interpolation and formatting
  //       https://www.i18next.com/translation-function/formatting
  //       https://www.i18next.com/translation-function/interpolation
  return template(i18next.t(key, options), args)
}
