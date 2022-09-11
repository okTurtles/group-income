'use strict'

import type { JSONObject } from '~/shared/types.ts'

import sbp from '@sbp/sbp'
import { NOTIFICATION_TYPE } from '~/shared/pubsub.ts'
import { handleFetchResult } from './utils/misc.js'
import { PUBSUB_INSTANCE } from './instance-keys.js'

// Used by 'backend/translations/get'
// Do not include 'english.json' here unless the browser might need to download it.
const languageFileMap = new Map([
  ['fr', 'french.json']
])

sbp('okTurtles.events/on', NOTIFICATION_TYPE.APP_VERSION, (version) => {
  console.info('New Group Income version available:', version)
  // Prevent the client from trying to reconnect when the page starts unloading.
  sbp('okTurtles.data/get', PUBSUB_INSTANCE).destroy()
  // TODO: allow the user to manually reload the page later.
  window.location.reload()
})

sbp('sbp/selectors/register', {
  /**
   * Fetches a JSON object containing translation strings for a given language.
   *
   * @param language - A BPC-47 language tag like the value
   * of `navigator.language`.
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
})
