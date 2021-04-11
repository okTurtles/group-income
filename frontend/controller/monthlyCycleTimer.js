'use strict'

import sbp from '~/shared/sbp.js'
import { cycleAtDate } from '~/frontend/utils/time.js'

// Make the interval faster if we're running cypress so that it doesn't time out:
const monthlyCycleIntervalMilliseconds = process.env.NODE_ENV === 'development' ? 1000 : 5000

let timerStartInterval

export function startMonthlyCycleCheckInterval (store: Object) {
  if (timerStartInterval) clearInterval(timerStartInterval)
  timerStartInterval = setInterval(() => {
    if (store.state.currentGroupId) {
      const events = store.getters.currentGroupState.distributionEvents
      const firstEvent = events[0]
      const lastEvent = events[events.length - 1]
      if (Math.floor(lastEvent.data.cycle) !== Math.floor(cycleAtDate(new Date(), firstEvent.data.when))) {
        console.table(lastEvent)
        // run our sbp selector here
        sbp('gi.actions/group/resetMonth', store.state.currentGroupId)
      }
    }
  }, monthlyCycleIntervalMilliseconds)
}
