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
    html: String,
    compile: Boolean
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
      console.warn("i18n: using 'html' as string is deprecated! Instead: set 'compile' attribute and place HTML opening/closing tags in :args variables, then place text as child of i18n!", { text })
      context.props.compile = true
    }
    if (context.props.compile) {
      var result = Vue.compile('<wrap>' + translation + '</wrap>')
      // console.log('TRANSLATED RENDERED TEXT:', context, result.render.toString())
      return result.render.call({
        _c: (tag, ...args) => {
          if (tag === 'wrap') {
            return h(context.props.tag, context.data, ...args)
          } else {
            return h(tag, ...args)
          }
        },
        _v: x => x
      })
    } else {
      if (!context.data.domProps) context.data.domProps = {}
      context.data.domProps.innerText = translation
      return h(context.props.tag, context.data)
    }
  }
})
