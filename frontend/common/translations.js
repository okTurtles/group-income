'use strict'

// since this file is loaded by common.js, we avoid circular imports and directly import
import sbp from '@sbp/sbp'
import { defaultConfig as defaultDompurifyConfig } from './vSafeHtml.js'
import dompurify from 'dompurify'
import Vue from 'vue'
import template from './stringTemplate.js'

Vue.prototype.L = L
Vue.prototype.LTags = LTags

const defaultLanguage = 'en-US'
const defaultLanguageCode = 'en'
const defaultTranslationTable: { [string]: string } = {}

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

let currentLanguage = defaultLanguage
let currentLanguageCode = defaultLanguage.split('-')[0]
let currentTranslationTable = defaultTranslationTable

/**
 * Loads the translation file corresponding to a given language.
 *
 * @param language - A BPC-47 language tag like the value
 * of `navigator.language`.
 *
 * Language tags must be compared in a case-insensitive way (§2.1.1.).
 *
 * @see https://tools.ietf.org/rfc/bcp/bcp47.txt
 */
sbp('sbp/selectors/register', {
  'translations/init': async function init (language: string): Promise<void> {
    // A language code is usually the first part of a language tag.
    const [languageCode] = language.toLowerCase().split('-')

    // No need to do anything if the requested language is already in use.
    if (language.toLowerCase() === currentLanguage.toLowerCase()) return

    // We can also return early if only the language codes match,
    //   since we don't have culture-specific translations yet.
    if (languageCode === currentLanguageCode) return

    // Avoid fetching any ressource if the requested language is the default one.
    if (languageCode === defaultLanguageCode) {
      currentLanguage = defaultLanguage
      currentLanguageCode = defaultLanguageCode
      currentTranslationTable = defaultTranslationTable
      return
    }
    try {
      currentTranslationTable = (await sbp('backend/translations/get', language)) || defaultTranslationTable

      // Only set `currentLanguage` if there was no error fetching the ressource.
      currentLanguage = language
      currentLanguageCode = languageCode
    } catch (error) {
      console.error(error)
    }
  }
})

/*
Examples:

Simple string:
  i18n Hello world

String with variables:
  i18n(
    :args='{ name: ourUsername }'
  ) Hello {name}!

String with HTML markup inside:
  i18n(
    :args='{ ...LTags("strong", "span"), name: ourUsername }'
  ) Hello {strong_}{name}{_strong}, today it's a {span_}nice day{_span}!
  | or
  i18n(
    :args='{ ...LTags("span"), name: "<strong>${ourUsername}</strong>" }'
  ) Hello {name}, today it's a {span_}nice day{_span}!

String with Vue components inside:
  i18n(
    compile
    :args='{ r1: `<router-link class="link" to="/login">`, r2: "</router-link>"}'
  ) Go to {r1}login{r2} page.

## When to use LTags or write html as part of the key?
- Use LTags when they wrap a variable and raw text. Example:

  i18n(
    :args='{ count: 5, ...LTags("strong") }'
  ) Invite {strong}{count} members{strong} to the party!

- Write HTML when it wraps only the variable.
-- That way translators don't need to worry about extra information.
  i18n(
    :args='{ count: "<strong>5</strong>" }'
  ) Invite {count} members to the party!
*/

export function LTags (...tags: string[]): {|br_: string|} {
  const o = {
    'br_': '<br/>'
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

export function LError (error: Error): {|reportError: any|} {
  let url = `/app/dashboard?modal=UserSettingsModal&section=application-logs&errorMsg=${encodeURI(error.message)}`
  if (!sbp('state/vuex/state').loggedIn) {
    url = 'https://github.com/okTurtles/group-income/issues'
  }
  return {
    reportError: L('"{errorMsg}". You can {a_}report the error{_a}.', {
      errorMsg: error.message,
      'a_': `<a class="link" target="_blank" href="${url}">`,
      '_a': '</a>'
    })
  }
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
