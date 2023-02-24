'use strict'

import sbp from '@sbp/sbp'
import { Vue } from '@common/common.js'
// $FlowFixMe
import { objectOf, string, isFunction } from '@model/contracts/misc/flowTyper.js'
import { MINS_MILLIS } from '@model/contracts/shared/time.js'
import { PERIODIC_NOTIFICATION_TYPE } from './constants.js'

const { MIN1, MIN5, MIN30 } = PERIODIC_NOTIFICATION_TYPE

const every1MinTimeout = { queue: [], state: {}, delay: 0.2 * MINS_MILLIS }
const every5MinTimeout = { queue: [], state: {}, delay: 5 * MINS_MILLIS }
const every30MinTimeout = { queue: [], state: {}, delay: 30 * MINS_MILLIS }

const typeToObjectMap = {
  [MIN1]: every1MinTimeout,
  [MIN5]: every5MinTimeout,
  [MIN30]: every30MinTimeout
}

const validateNotificationData = objectOf({
  stateKey: string,
  emitCondition: isFunction,
  emit: isFunction,
  shouldClearStateKey: isFunction
})

async function runQueueRecursive (data) {
  const rootState = sbp('state/vuex/state')
  const rootGetters = sbp('state/vuex/getters')
  const firedMap = rootState.periodicNotificationAlreadyFiredMap
  const callWithStates = func => func.call(data.state, { rootState, rootGetters })

  for (const entry of data.queue) {
    if (!firedMap[entry.stateKey] && callWithStates(entry.emitCondition)) {
      await callWithStates(entry.emit)
      Vue.set(firedMap, entry.stateKey, true)
    }

    if (firedMap[entry.stateKey] && callWithStates(entry.shouldClearStateKey)) {
      Vue.delete(firedMap, entry.stateKey)
    }
  }

  data.state.timeoutId = setTimeout(() => runQueueRecursive(data), data.delay)
}

function clearTimeoutObject (data) {
  clearTimeout(data.state.timeoutId)
  data.state = {}
}

sbp('sbp/selectors/register', {
  'gi.periodicNotifications/init': function () {
    runQueueRecursive(every1MinTimeout)
    runQueueRecursive(every5MinTimeout)
    runQueueRecursive(every30MinTimeout)
  },
  'gi.periodicNotifications/destroyAll': function () {
    const rootState = sbp('state/vuex/state')

    Vue.set(rootState, 'periodicNotificationAlreadyFiredMap', {})
    clearTimeoutObject(every1MinTimeout)
    clearTimeoutObject(every5MinTimeout)
    clearTimeoutObject(every30MinTimeout)
  },
  'gi.periodicNotifications/createEntry': function ({ type, notificationData }) {
    if (!type || !notificationData) throw new Error('A required argument is missing for "gi.periodicNotifications/createEntry"')
    validateNotificationData(notificationData)

    const queue = typeToObjectMap[type].queue
    queue.push(notificationData)

    return queue
  }
})
