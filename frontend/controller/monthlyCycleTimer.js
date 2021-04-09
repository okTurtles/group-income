'use strict'

import sbp from '~/shared/sbp.js'

// Make the interval faster if we're running cypress so that it doesn't time out:
const monthlyCycleIntervalMilliseconds = process.env.NODE_ENV === 'development' ? 1000 : 5000

let timerStartInterval

function monthlyCycleCheckHandler (store) {
  const groupID = store.state.currentGroupId
  if (groupID) {
    sbp('gi.actions/group/resetMonth', groupID)
  }
}

export function startMonthlyCycleCheckInterval (store) {
  if (timerStartInterval) clearInterval(timerStartInterval)
  timerStartInterval = setInterval(() => {
    monthlyCycleCheckHandler(store)
  }, monthlyCycleIntervalMilliseconds)
}
