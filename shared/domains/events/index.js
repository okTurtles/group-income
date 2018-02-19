'use strict'

// =======================
// Domain: Event publish/subscribe
// =======================

import sbp from '../../sbp'

export default {
  // TODO: add ability to unregister listeners
  '/on/v2': function (event, handler) {
    sbp('data/add/v1', `events/${event}/listeners`, handler)
  },
  '/once/v2': function (event, handler) {
    sbp('data/add/v1', `events/${event}/listeners`, handler)
  },
  '/emit/v2': function (event, data) {
    const listeners = sbp('data/get/v1', `events/${event}/listeners`)
    listeners.forEach(listener => listener({event, data}))
    // TODO next up in SBP conversion: listener => sbp(listener, event, data)
    const listenOnce = sbp('data/get/v1', `events/${event}/listenOnce`)
    listenOnce.forEach(listener => listener({event, data}))
    sbp('data/set/v1', `events/${event}/listenOnce`, [])
  }
}
