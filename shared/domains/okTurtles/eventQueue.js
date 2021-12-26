'use strict'

// =======================
// Domain: Serial Event Queue
//
// Use this to ensure asynchronous SBP invocations get invoked serially,
// one after another, waiting for the previous invocation to finish completely.
// =======================

import sbp from '~/shared/sbp.js'

const eventQueues = {}
const STATE_PENDING = 0
const STATE_INVOKING = 1
const STATE_FINISHED = 2

export default (sbp('sbp/selectors/register', {
  // TODO: define a proper sbpInvocation Flowtype
  'okTurtles.eventQueue/queueEvent': async function (name: string, sbpInvocation: any[]) {
    if (!eventQueues[name]) {
      eventQueues[name] = { events: [] }
    }
    const events = eventQueues[name].events
    events.push({
      sbpInvocation,
      state: STATE_PENDING,
      promise: null
    })
    while (events.length > 0) {
      const event = events[0]
      if (event.state === STATE_PENDING) {
        event.state = STATE_INVOKING
        event.promise = sbp(...event.sbpInvocation)
        await event.promise
        event.state = STATE_FINISHED
      } else if (event.state === STATE_INVOKING) {
        // wait for invocation to finish
        await event.promise
      } else {
        // STATE_FINISHED
        events.shift()
      }
    }
  }
}): any)
