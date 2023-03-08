'use strict'

import sbp from '@sbp/sbp'
import { Vue } from '@common/common.js'
// $FlowFixMe
import { objectOf, string, isFunction } from '@model/contracts/misc/flowTyper.js'
import { MINS_MILLIS } from '@model/contracts/shared/time.js'

export const PERIODIC_NOTIFICATION_TYPE = {
  MIN1: '1MIN',
  MIN5: '5MIN',
  MIN15: '15MIN',
  MIN30: '30MIN'
}

const every1MinTimeout = { notifications: [], state: {}, delay: MINS_MILLIS }
const every5MinTimeout = { notifications: [], state: {}, delay: 5 * MINS_MILLIS }
const every15MinTimeout = { notifications: [], state: {}, delay: 0.2 * MINS_MILLIS } // TODO!!: 0.2 -> 15 once the test is done
const every30MinTimeout = { notifications: [], state: {}, delay: 30 * MINS_MILLIS }

const typeToObjectMap = {
  [PERIODIC_NOTIFICATION_TYPE.MIN1]: every1MinTimeout,
  [PERIODIC_NOTIFICATION_TYPE.MIN5]: every5MinTimeout,
  [PERIODIC_NOTIFICATION_TYPE.MIN15]: every15MinTimeout,
  [PERIODIC_NOTIFICATION_TYPE.MIN30]: every30MinTimeout
}

const validateNotificationData = objectOf({
  stateKey: string,
  emitCondition: isFunction,
  emit: isFunction,
  shouldClearStateKey: isFunction
})

async function runNotificationListRecursive (data) {
  const rootState = sbp('state/vuex/state')
  const rootGetters = sbp('state/vuex/getters')
  const firedMap = rootState.periodicNotificationAlreadyFiredMap
  const callWithStates = func => func.call(data.state, { rootState, rootGetters })

  for (const entry of data.notifications) {
    if (!firedMap[entry.stateKey] && callWithStates(entry.emitCondition)) {
      await callWithStates(entry.emit)
      Vue.set(firedMap, entry.stateKey, true)
    }

    if (firedMap[entry.stateKey] && callWithStates(entry.shouldClearStateKey)) {
      Vue.delete(firedMap, entry.stateKey)
    }
  }

  data.state.timeoutId = setTimeout(() => runNotificationListRecursive(data), data.delay)
}

function clearTimeoutObject (data) {
  clearTimeout(data.state.timeoutId)
  data.state = {}
}

sbp('sbp/selectors/register', {
  'gi.periodicNotifications/init': function () {
    runNotificationListRecursive(every1MinTimeout)
    runNotificationListRecursive(every5MinTimeout)
    runNotificationListRecursive(every15MinTimeout)
    runNotificationListRecursive(every30MinTimeout)
  },
  'gi.periodicNotifications/clearStatesAndStopTimers': function () {
    const rootState = sbp('state/vuex/state')

    Vue.set(rootState, 'periodicNotificationAlreadyFiredMap', {})
    clearTimeoutObject(every1MinTimeout)
    clearTimeoutObject(every5MinTimeout)
    clearTimeoutObject(every15MinTimeout)
    clearTimeoutObject(every30MinTimeout)
  },
  'gi.periodicNotifications/importNotifications': function (entries) {
    for (const { type, notificationData } of entries) {
      if (!type || !notificationData) throw new Error('A required field in a periodic notification entry is missing.')
      validateNotificationData(notificationData)

      const notificationList = typeToObjectMap[type].notifications
      notificationList.push(notificationData)
    }
  }
})
