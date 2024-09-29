'use strict'

import { L, LTags } from '@common/common.js'
import dompurify from 'dompurify'
import Vue from 'vue'
import { defaultConfig as defaultDompurifyConfig } from './vSafeHtml.js'

Vue.prototype.L = L
Vue.prototype.LTags = LTags

/**
 * Allow 'href' and 'target' attributes to avoid breaking our hyperlinks,
 * but keep sanitizing their values.
 * See https://github.com/cure53/DOMPurify#can-i-configure-dompurify
 */
const dompurifyConfig = {
  ...defaultDompurifyConfig,
  ALLOWED_ATTR: ['class', 'href', 'rel', 'target'],
  ALLOWED_TAGS: ['a', 'b', 'br', 'button', 'em', 'i', 'p', 'small', 'span', 'strong', 'sub', 'sup', 'u'],
  RETURN_DOM_FRAGMENT: false
}

function sanitize (inputString) {
  return dompurify.sanitize(inputString, dompurifyConfig)
}

Vue.component('i18n', {
  functional: true,
  props: {
    args: [Object, Array],
    tag: {
      type: String,
      default: 'span'
    },
    compile: Boolean
  },
  render: function (h, context) {
    const text = context.children[0].text
    const translation = L(text, context.props.args || {})
    if (!translation) {
      console.warn('The following i18n text was not translated correctly:', text)
      return h(context.props.tag, context.data, text)
    }
    // Prevent reverse tabnabbing by including `rel="noopener noreferrer"` when rendering as an outbound hyperlink.
    if (context.props.tag === 'a' && context.data.attrs.target === '_blank') {
      context.data.attrs.rel = 'noopener noreferrer'
    }
    if (context.props.compile) {
      const result = Vue.compile('<wrap>' + sanitize(translation) + '</wrap>')
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
      context.data.domProps.innerHTML = sanitize(translation)
      return h(context.props.tag, context.data)
    }
  }
})
