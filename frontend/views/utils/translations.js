import i18next from 'i18next'
import XHR from 'i18next-xhr-backend'
import Vue from 'vue'
import template from '@utils/stringTemplate.js'

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

Vue.component('i18n', {
  functional: true,
  props: {
    args: [Object, Array],
    tag: {
      type: String,
      default: 'span'
    },
    html: [String]
  },
  render: function (h, context) {
    // const text = context.props.html || context.children[0].text || context.$slots.default[0].text
    const text = context.props.html || context.children[0].text
    const translation = L(text, context.props.args || {}, { defaultValue: text })
    if (!translation) {
      console.warn('The following i18n text was not translated correctly:', text)
      return h(context.props.tag, context.data, text)
    }
    if (context.props.html) {
      console.warn("i18n: using 'html' attribute is deprecated and will be removed! Place HTML opening/closing tags in :args variables and place text as child of i18n!", { text })
    }
    var result = Vue.compile('<wrap>' + translation + '</wrap>')
    // console.log('TRANSLATED RENDERED TEXT:', context, result.render.toString())
    result = result.render.call({
      _c: (tag, ...args) => {
        if (tag === 'wrap') {
          return h(context.props.tag, context.data, ...args)
        } else {
          return h(tag, ...args)
        }
      },
      _v: x => x
    })
    // console.log('TRANSLATION:', result)
    return result
    // if (!context.data.domProps) context.data.domProps = {}
    // context.data.domProps.innerHTML = translation
    // return h(context.props.tag, context.data)
  }
})
