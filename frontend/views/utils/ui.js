'use strict'

import {
  sbp,
  OPEN_MODAL, MODAL_RESPONSE
} from '/assets/js/common.js' // eslint-disable-line import/no-absolute-path

export default (sbp('sbp/selectors/register', {
  'gi.ui/prompt': function (params: Object): Promise<*> {
    sbp('okTurtles.events/emit', OPEN_MODAL, 'Prompt', null, params)

    return new Promise((resolve, reject) => {
      sbp('okTurtles.events/once', MODAL_RESPONSE, function (response) {
        resolve(response)
      })
    })
  }
}): Object)
