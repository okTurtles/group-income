'use strict'

// =======================
// Domain: Event publish/subscribe
// =======================

import sbp from '../../../sbp.js'

const listenOnceKey = evt => `events/${evt}/listenOnce`
const listenKey = evt => `events/${evt}/listeners`

export default sbp('sbp/selectors/register', {
  'okTurtles.events/on': function (event: string, handler: Function) {
    sbp('okTurtles.data/pushValue', listenKey(event), handler)
  },
  'okTurtles.events/once': function (event: string, handler: Function) {
    sbp('okTurtles.data/pushValue', listenOnceKey(event), handler)
  },
  'okTurtles.events/emit': function (event: string, ...data: any) {
    const listeners = sbp('okTurtles.data/get', listenKey(event)) || []
    const listenOnce = sbp('okTurtles.data/get', listenOnceKey(event)) || []
    listeners.forEach(listener => listener(...data))
    listenOnce.forEach(listener => listener(...data))
    sbp('okTurtles.data/delete', listenOnceKey(event))
  },
  // almost identical to Vue.prototype.$off, except we require `event` argument
  'okTurtles.events/off': function (event: string, handler: ?Function) {
    if (handler) {
      sbp('okTurtles.data/popValue', listenKey(event), handler)
      sbp('okTurtles.data/popValue', listenOnceKey(event), handler)
    } else {
      sbp('okTurtles.data/delete', listenKey(event))
      sbp('okTurtles.data/delete', listenOnceKey(event))
    }
  }
})
