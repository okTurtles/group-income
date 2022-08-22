'use strict'

import sbp from '@sbp/sbp'
import { L, LError } from '@common/common.js'
import { OPEN_MODAL, MODAL_RESPONSE } from '@utils/events.js'

// Call from anywhere in the app (after BANNER has been set via 'okTurtles.data/set'):
// sbp('gi.ui/showBanner', L('Trying to reconnect...'), 'wifi')
// sbp('gi.ui/dangerBanner', L('message'), 'icon-type')
// sbp('gi.ui/clearBanner')

export default (sbp('sbp/selectors/register', {
  'gi.ui/prompt' (params: Object): Promise<*> {
    sbp('okTurtles.events/emit', OPEN_MODAL, 'Prompt', null, params)

    return new Promise((resolve, reject) => {
      sbp('okTurtles.events/once', MODAL_RESPONSE, function (response) {
        resolve(response)
      })
    })
  },
  'gi.ui/clearBanner' (): void {
    sbp('okTurtles.data/get', 'BANNER')?.clean()
  },
  'gi.ui/dangerBanner' (message: string, icon: string = 'exclamation-triangle'): void {
    sbp('okTurtles.data/get', 'BANNER')?.danger(message, icon)
  },
  'gi.ui/showBanner' (message: string, icon: string): void {
    sbp('okTurtles.data/get', 'BANNER')?.show(message, icon)
  },
  'gi.ui/seriousErrorBanner' (e: Error): void {
    sbp('okTurtles.data/get', 'BANNER')?.danger(
      L('Fatal error: {reportError}', LError(e)), 'exclamation-triangle'
    )
  }
}): Object)
