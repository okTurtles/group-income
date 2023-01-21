'use strict'

import sbp from '@sbp/sbp'
import { defaultConfig as defaultDompurifyConfig } from '@view-utils/vSafeHtml.js'
import dompurify from 'dompurify'
import Vue from 'vue'
import template from './stringTemplate.js'

const defaultLanguage = 'en-US'
const defaultLanguageCode = 'en'
const defaultTranslationTable: { [string]: string } = {}

const dompurifyConfig = {
  ...defaultDompurifyConfig,
  ALLOWED_ATTR: ['class', 'href', 'rel', 'target'],
  ALLOWED_TAGS: ['a', 'b', 'br', 'button', 'em', 'i', 'p', 'small', 'span', 'strong', 'sub', 'sup', 'u'],
  RETURN_DOM_FRAGMENT: false
}

let currentLanguage = defaultLanguage
let currentLanguageCode = defaultLanguage.split('-')[0]
let currentTranslationTable = defaultTranslationTable

sbp('sbp/selectors/register', {
  'translations/init': async function init (language: string): Promise<void> {
    // language code is usually the first part of a language tag
    const [languageCode] = language.toLowerCase().split('-')

    if (process.env.NODE_ENV === 'development' || // turn off translation in development
      language.toLowerCase() === currentLanguage.toLowerCase() // No need to do anything if the requested language is already in use
    ) return

    if (languageCode === currentLanguageCode) return

    if (languageCode === defaultLanguageCode) {
      currentLanguage = defaultLanguage
      currentLanguageCode = defaultLanguageCode
      currentTranslationTable = defaultTranslationTable
      return
    }
    try {
      currentTranslationTable = (await sbp('backend/translations/get', language)) || defaultTranslationTable

      currentLanguage = language
      currentLanguageCode = languageCode
    } catch (error) {
      console.error(error)
    }
  }
})

export function Ltags (...tags: string[]): {br_: string} {
  const o: {[string]: string} = {
    'br_': '<br />'
  }
  for (const tag of tags) {
    o[`${tag}_`] = `<${tag}>`
    o[`_${tag}`] = `</${tag}>`
  }
  return o
}

export default function L (
  key: string,
  args: Array<*> | Object | void
): string {
  return template(currentTranslationTable[key] || key, args)
    // Avoid inopportune linebreaks before certain punctuations.
    .replace(/\s(?=[;:?!])/g, '&nbsp;')
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
    }
  },
  render: function (h, context) {
    const text = context.children[0].text
    const translation = L(text, context.props.args || {})

    if (!translation) {
      console.warn('The following i18n text was not translated correctly: ', text)
      return h(context.props.tag, context.data, text)
    }
    // Prevent reverse tabnabbing by including `rel="noopener noreferrer"` when rendering as an outbound hyperlink.
    if (context.props.tag === 'a' && context.data.attrs.target === '_blank') {
      context.data.attrs.rel = 'noopener noreferrer'
    }

    if (!context.data.domProps) context.data.domProps = {}
    context.data.domProps.innerHTML = sanitize(translation)
    return h(context.props.tag, context.data)
  }
})
