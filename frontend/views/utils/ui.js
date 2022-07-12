'use strict'

import sbp from '@sbp/sbp'
import { OPEN_MODAL, MODAL_RESPONSE } from '@utils/events.js'
import L, { LError } from '@view-utils/translations.js'

export default (sbp('sbp/selectors/register', {
  'gi.ui/prompt' (params: Object): Promise<*> {
    sbp('okTurtles.events/emit', OPEN_MODAL, 'Prompt', null, params)

    return new Promise((resolve, reject) => {
      sbp('okTurtles.events/once', MODAL_RESPONSE, function (response) {
        resolve(response)
      })
    })
  },
  'gi.ui/seriousErrorBanner' (e: Error): void {
    sbp('okTurtles.data/get', 'BANNER').danger(
      L('Fatal error: {reportError}', LError(e)), 'exclamation-triangle'
    )
  }
}): Object)
