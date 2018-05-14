'use strict'

// =======================
// Domain: Event publish/subscribe
// =======================

import sbp from '../../../sbp'

export default {
  // TODO: add ability to unregister listeners
  'okTurtles.events/on': function (event: string, handler: Function) {
    sbp('okTurtles.data/add', `events/${event}/listeners`, handler)
  },
  'okTurtles.events/once': function (event: string, handler: Function) {
    sbp('okTurtles.data/add', `events/${event}/listenOnce`, handler)
  },
  'okTurtles.events/emit': function (event: string, data: any) {
    const listeners = sbp('okTurtles.data/get', `events/${event}/listeners`) || []
    listeners.forEach(listener => listener({event, data}))
    // TODO next up in SBP conversion: listener => sbp(listener, event, data)
    const listenOnce = sbp('okTurtles.data/get', `events/${event}/listenOnce`) || []
    listenOnce.forEach(listener => listener({event, data}))
    sbp('okTurtles.data/set', `events/${event}/listenOnce`, [])
  }
}
