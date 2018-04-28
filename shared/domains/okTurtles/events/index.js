'use strict'

// =======================
// Domain: Event publish/subscribe
// =======================

import sbp from '../../../sbp'

export default {
  // TODO: add ability to unregister listeners
  '/on': function (event, handler) {
    sbp('okTurtles.data/add', `events/${event}/listeners`, handler)
  },
  '/once': function (event, handler) {
    sbp('okTurtles.data/add', `events/${event}/listenOnce`, handler)
  },
  '/emit': function (event, data) {
    const listeners = sbp('okTurtles.data/get', `events/${event}/listeners`) || []
    listeners.forEach(listener => listener({event, data}))
    // TODO next up in SBP conversion: listener => sbp(listener, event, data)
    const listenOnce = sbp('okTurtles.data/get', `events/${event}/listenOnce`) || []
    listenOnce.forEach(listener => listener({event, data}))
    sbp('okTurtles.data/set', `events/${event}/listenOnce`, [])
  }
}
