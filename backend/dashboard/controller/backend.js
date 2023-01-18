'use strict'

import sbp from '@sbp/sbp'

// Used by 'backend/translations/get'
// Do not include 'english.json' here unless the browser might need to download it.
const languageFileMap = new Map([
  ['ko', 'korean.json']
])

export function handleFetchResult (type: string): ((r: any) => any) {
  return function (r: Object) {
    if (!r.ok) throw new Error(`${r.status}: ${r.statusText}`)
    return r[type]()
  }
}

sbp('sbp/selectors/register', {
  async 'backend/translations/get' (language: string): Promise<?JSONObject> {
    // The language code is usually the first part of the language tag.
    const [languageCode] = language.toLowerCase().split('-')
    const languageFileName = languageFileMap.get(languageCode) || ''

    if (languageFileName !== '') {
      return await fetch(`${sbp('okTurtles.data/get', 'API_URL')}/assets/strings-dashboard/${languageFileName}`)
        .then(handleFetchResult('json'))
    }
  }
})
