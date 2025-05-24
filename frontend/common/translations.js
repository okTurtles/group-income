'use strict'

// since this file is loaded by common.js, we avoid circular imports and directly import
import sbp from '@sbp/sbp'
import template from './stringTemplate.js'

const defaultLanguage = 'en-US'
const defaultLanguageCode = 'en'
const defaultTranslationTable: { [string]: string } = {}

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
export default (sbp('sbp/selectors/register', {
  'translations/init': async function init (language: string): Promise<void> {
    // A language code is usually the first part of a language tag.
    const [languageCode] = language.toLowerCase().split('-')

    // No need to do anything if the requested language is already in use.
    if (language.toLowerCase() === currentLanguage.toLowerCase()) return

    // We can also return early if only the language codes match,
    //   since we don't have culture-specific translations yet.
    if (languageCode === currentLanguageCode) return

    // Avoid fetching any resource if the requested language is the default one.
    if (languageCode === defaultLanguageCode) {
      currentLanguage = defaultLanguage
      currentLanguageCode = defaultLanguageCode
      currentTranslationTable = defaultTranslationTable
      return
    }
    try {
      currentTranslationTable = (await sbp('backend/translations/get', language)) || defaultTranslationTable

      // Only set `currentLanguage` if there was no error fetching the resource.
      currentLanguage = language
      currentLanguageCode = languageCode
    } catch (error) {
      console.error(error)
    }
  }
}): string[])

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

export function L (
  key: string,
  args: Array<*> | Object | void
): string {
  return template(currentTranslationTable[key] || key, args)
    // Avoid inopportune linebreaks before certain punctuations.
    // '\u00a0' is a non-breaking space
    // The character is used instead of `&nbsp;` or `&#160;` for conciseness
    // and compatibility.
    .replace(/\s(?=[;:?!])/g, '\u00a0')
}

export function LError (error: Error, toGithub?: boolean): {|reportError: any|} {
  let url = 'https://github.com/okTurtles/group-income/issues'
  if (!toGithub && sbp('state/vuex/state').loggedIn) {
    const baseRoute = sbp('controller/router').options.base
    url = `${baseRoute}?modal=UserSettingsModal&tab=application-logs&errorMsg=${encodeURIComponent(error.message)}`
  }
  return {
    reportError: L('"{errorMsg}". You can {a_}report the error{_a}.', {
      errorMsg: error.message,
      'a_': `<a class="link" target="_blank" href="${url}">`,
      '_a': '</a>'
    })
  }
}
