'use strict'

import sbp from '@sbp/sbp'
import { Vue } from '@common/common.js'
// $FlowFixMe
import { objectOf, string, isFunction } from '@model/contracts/misc/flowTyper.js'
import { MINS_MILLIS } from '@model/contracts/shared/time.js'
import { PERIODIC_NOTIFICATION_TYPE } from './constants.js'

const { MIN1, MIN5, MIN30 } = PERIODIC_NOTIFICATION_TYPE
let timeoutId1Min, timeoutId5Min, timeoutId30Min
const every1MinQueue = []
const every5MinQueue = []
const every30MinQueue = []

const typeToQueueMap = {
  [MIN1]: every1MinQueue,
  [MIN5]: every5MinQueue,
  [MIN30]: every30MinQueue
}

const validateNotificationData = objectOf({
  stateKey: string,
  emitCondition: isFunction,
  emit: isFunction,
  shouldClearStateKey: isFunction
})

/*
  --- notification entry object ---
  1) stateKey: a key name used to store a boolean in rootState.periodicNotificationAlreadyFiredMap.
                          Being undefined in the rootState means the notification hasn't been fired, and setting it to 'true' means it has.

  2) emitCondition: a function that returns a boolean that determines whether or not to emit a notification
  3) emit: logic to emit a notification
  4) shouldClearStateKey: a function that returns true to delete the stateKey from rootState, which marks the notification as 'has not been fired' again.
*/

async function runNotificationQueue (queue) {
  console.log('@@@ runnint notification queue!!: ', queue)
  const firedMap = sbp('state/vuex/state').periodicNotificationAlreadyFiredMap

  for (const entry of queue) {
    if (!firedMap[entry.stateKey] && entry.emitCondition()) {
      await entry.emit()
      Vue.set(firedMap, entry.stateKey, true)
    }

    if (firedMap[entry.stateKey] && entry.shouldClearStateKey()) {
      Vue.delete(firedMap, entry.stateKey)
    }
  }
}

function runQueueRecursive (queue, timeout, id) {
  id = setTimeout(() => {
    runNotificationQueue(queue)
    runQueueRecursive(queue, timeout, id)
  }, timeout)
}

sbp('sbp/selectors/register', {
  'gi.periodicNotifications/init': function () {
    runQueueRecursive(every1MinQueue, MINS_MILLIS, timeoutId1Min)
    runQueueRecursive(every5MinQueue, 5 * MINS_MILLIS, timeoutId5Min)
    runQueueRecursive(every30MinQueue, 30 * MINS_MILLIS, timeoutId30Min)
  },
  'gi.periodicNotifications/destroyAll': function () {
    const rootState = sbp('state/vuex/state')

    Vue.set(rootState, 'periodicNotificationAlreadyFiredMap', {})
    clearTimeout(timeoutId1Min)
    clearTimeout(timeoutId5Min)
    clearTimeout(timeoutId30Min)
  },
  'gi.periodicNotifications/createEntry': function ({ type, notificationData }) {
    if (!type || !notificationData) throw new Error('A required argument is missing for "gi.periodicNotifications/createEntry"')
    validateNotificationData(notificationData)

    const queue = typeToQueueMap[type]
    queue.push(notificationData)

    return queue
  }
})
