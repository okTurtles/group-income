'use strict'

import sbp from '@sbp/sbp'
import { L, LError } from '@common/common.js'
import { OPEN_MODAL, MODAL_RESPONSE, SHOW_TOAST } from '@utils/events.js'

// Call from anywhere in the app (after BANNER has been set via 'okTurtles.data/set'):
// sbp('gi.ui/showBanner', L('Trying to reconnect...'), 'wifi')
// sbp('gi.ui/dangerBanner', L('message'), 'icon-type')
// sbp('gi.ui/clearBanner')

type ToastData = {
  // These are the data definitions for 'gi.ui/toast' sbp call.
  // In .vue component, there can be additional properties added on top of these depending on the need.
  // e.g.) Properties like 'entered' don't need to be specified earlier at the call time.
  message: string,
  variant?: 'default' | 'success' | 'warning' | 'error',
  position?: 'top-right' | 'top-left' | 'top-center' | 'bottom-right' | 'bottom-left' | 'bottom-center',
  duration?: number, // in milliseconds
  icon?: string,
  closeable?: boolean
}

export default (sbp('sbp/selectors/register', {
  'gi.ui/prompt' (params: Object): Promise<*> {
    sbp('okTurtles.events/emit', OPEN_MODAL, 'Prompt', null, params)

    return new Promise((resolve, reject) => {
      sbp('okTurtles.events/once', MODAL_RESPONSE, function (response) {
        resolve(response)
      })
    })
  },
  'gi.ui/toast' (area: string, data: ToastData): void {
    if (!area || !data) {
      throw Error('sbp("gi.ui/toast") failed - Missing parameters')
    }

    const defaultData = {
      // Some default settings for the toast. Can be overridden by the data passed in.
      variant: 'default',
      position: 'bottom-right',
      closeable: true
    }

    sbp('okTurtles.events/emit', SHOW_TOAST, area, {
      ...defaultData, ...data
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
