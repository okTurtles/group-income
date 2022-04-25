'use strict'

import sbp from '~/shared/sbp.js'
import { OPEN_MODAL, MODAL_RESPONSE } from '@utils/events.js'

export default (sbp('sbp/selectors/register', {
  'gi.ui/prompt': function (params: Object): Promise<*> {
    sbp('okTurtles.events/emit', OPEN_MODAL, 'Prompt', null, params)

    return new Promise((resolve, reject) => {
      sbp('okTurtles.events/on', MODAL_RESPONSE, function (response) {
        sbp('okTurtles.events/off', MODAL_RESPONSE)
        resolve(response)
      })
    })
  }
}))
