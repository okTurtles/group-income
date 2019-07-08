'use strict'

// =======================
// Domain: Event publish/subscribe
// =======================

import sbp from '~/shared/sbp.js'

const listenKey = evt => `events/${evt}/listeners`

export default sbp('sbp/selectors/register', {
  'okTurtles.events/on': function (event: string, handler: Function) {
    sbp('okTurtles.data/add', listenKey(event), handler)
  },
  'okTurtles.events/once': function (event: string, handler: Function) {
    const cbWithOff = (...args) => {
      handler(...args)
      sbp('okTurtles.events/off', event, cbWithOff)
    }
    sbp('okTurtles.events/on', event, cbWithOff)
  },
  'okTurtles.events/emit': function (event: string, ...data: any) {
    const listeners = sbp('okTurtles.data/get', listenKey(event)) || []
    listeners.forEach(listener => listener(...data))
  },
  // almost identical to Vue.prototype.$off, except we require `event` argument
  'okTurtles.events/off': function (event: string, handler: ?Function) {
    if (handler) {
      sbp('okTurtles.data/remove', listenKey(event), handler)
    } else {
      sbp('okTurtles.data/delete', listenKey(event))
    }
  }
})
