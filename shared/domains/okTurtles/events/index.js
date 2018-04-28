'use strict'

// =======================
// Domain: Event publish/subscribe
// =======================

import sbp from '../../../sbp'

export default {
  // TODO: add ability to unregister listeners
  '/on': function (event, handler) {
    sbp('okTurtles.data/deepAdd', `events/${event}/listeners`, handler)
  },
  '/once': function (event, handler) {
    sbp('okTurtles.data/deepAdd', `events/${event}/listenOnce`, handler)
  },
  '/emit': function (event, data) {
    const listeners = sbp('okTurtles.data/deepGet', `events/${event}/listeners`) || []
    listeners.forEach(listener => listener({event, data}))
    // TODO next up in SBP conversion: listener => sbp(listener, event, data)
    const listenOnce = sbp('okTurtles.data/deepGet', `events/${event}/listenOnce`) || []
    listenOnce.forEach(listener => listener({event, data}))
    sbp('okTurtles.data/deepSet', `events/${event}/listenOnce`, [])
  }
}
