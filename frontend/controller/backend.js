'use strict'

import type { JSONObject } from '@chelonia/lib/types'

import sbp from '@sbp/sbp'
import { HOURS_MILLIS } from '~/frontend/model/contracts/shared/time.js'
import { NOTIFICATION_TYPE } from '@chelonia/lib/pubsub'
import { handleFetchResult } from './utils/misc.js'
import { PUBSUB_INSTANCE } from './instance-keys.js'

// Used by 'backend/translations/get'
// Do not include 'english.json' here unless the browser might need to download it.
// https://appmakers.substack.com/p/bcp-47-language-codes-list
const languageFileMap = new Map([
  ['fr', 'french.json'],
  ['ru', 'russian.json'],
  ['ko', 'korean.json'],
  ['es', 'spanish.json'],
  ['ja', 'japanese.json'],
  ['uk', 'ukrainian.json'],
  ['pt', 'portuguese.json'],
  ['zh', 'chinese.json']
])

sbp('okTurtles.events/on', NOTIFICATION_TYPE.VERSION_INFO, (versionInfo) => {
  if (versionInfo.GI_VERSION === process.env.GI_VERSION) {
    // No refresh necessary, we're already at the latest version
    sessionStorage.removeItem(NOTIFICATION_TYPE.VERSION_INFO)
    return
  }

  console.info('New Group Income version available:', versionInfo)
  // TODO: allow the user to manually reload the page later.
  try {
    // Store the current VERSION_INFO in session storage to prevent infinite
    // reload loops
    const existingSerialized = sessionStorage.getItem(NOTIFICATION_TYPE.VERSION_INFO)
    if (existingSerialized) {
      const existingVersionInfo = JSON.parse(existingSerialized)
      if (
        Array.isArray(existingVersionInfo) &&
        !(Date.now() - existingVersionInfo[0] >= 2.5 * HOURS_MILLIS) &&
        versionInfo.GI_VERSION === existingVersionInfo[1].GI_VERSION
      ) {
        console.warn('[NOTIFICATION_TYPE.VERSION_INFO] A different Group Income version is available, but reloading has failed to address it', { existingVersionInfo, versionInfo })
        return
      }
    }

    sessionStorage.setItem(NOTIFICATION_TYPE.VERSION_INFO, JSON.stringify([Date.now(), versionInfo]))
  } catch (e) {
    console.error('[NOTIFICATION_TYPE.VERSION_INFO] Error in handler', e)
  }
  // Prevent the client from trying to reconnect when the page starts unloading.
  sbp('okTurtles.data/get', PUBSUB_INSTANCE)?.destroy()
  window.location.reload()
})

export default (sbp('sbp/selectors/register', {
  /**
   * Fetches a JSON object containing translation strings for a given language.
   *
   * @param language - A BPC-47 language tag like the value of `navigator.language`.
   *
   * @see The 'translations/init' SBP selector in `~view-utils/translations.js`.
   */
  async 'backend/translations/get' (language: string): Promise<?JSONObject> {
    // The language code is usually the first part of the language tag.
    const [languageCode] = language.toLowerCase().split('-')
    const languageFileName = languageFileMap.get(languageCode) || ''

    if (languageFileName !== '') {
      return await fetch(`${sbp('okTurtles.data/get', 'API_URL')}/assets/strings/${languageFileName}`)
        .then(handleFetchResult('json'))
    }
  }
}): string[])
