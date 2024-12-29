'use strict'

import sbp from '@sbp/sbp'
// $FlowFixMe
import { isFunction, objectOf, string } from '@model/contracts/misc/flowTyper.js'
import { MINS_MILLIS } from '@model/contracts/shared/time.js'

export const PERIODIC_NOTIFICATION_TYPE = {
  MIN1: '1MIN',
  MIN5: '5MIN',
  MIN15: '15MIN',
  MIN30: '30MIN'
}

const ephemeralNotificationState: { notifications: Array, partition: Object, clearTimeout?: Function } = { notifications: [], partition: Object.create(null) }

const delayToObjectMap = {
  [PERIODIC_NOTIFICATION_TYPE.MIN1]: 1 * MINS_MILLIS,
  [PERIODIC_NOTIFICATION_TYPE.MIN5]: 5 * MINS_MILLIS,
  [PERIODIC_NOTIFICATION_TYPE.MIN15]: 15 * MINS_MILLIS,
  [PERIODIC_NOTIFICATION_TYPE.MIN30]: 30 * MINS_MILLIS
}

const validateNotificationData = objectOf({
  stateKey: (value) => {
    value = string(value)
    if (value.length === 0) {
      throw new TypeError('Empty notification data state key')
    }
    return value
  },
  emitCondition: isFunction,
  emit: isFunction,
  shouldClearStateKey: isFunction
})

/**
 * Runs a recursive notification list handler that checks and emits
 * notifications based on specified conditions and delays.
 *
 * The function performs the following steps:
 * 1. Checks if enough time has passed since the last run based on the specified
 * delay.
 * 2. Iterates over each notification entry in the `data.notifications` array:
 *    - If the notification has not been fired and its emit condition evaluates
 *      to true, it:
 *        - Calls the emit function associated with the notification.
 *        - Marks the notification as fired in the `firedMap`.
 *    - If the notification has been fired and its clear condition evaluates to
 *      true, it:
 *        - Removes the notification from the `firedMap`.
 * 3. Updates the `lastRun` timestamp to the current time.
 * 4. Sets a timeout to recursively call `runNotificationListRecursive` after
 * the specified delay, adjusting for the time that has already passed since the
 * last run.
 */
async function runNotificationListRecursive () {
  const rootState = sbp('state/vuex/state')
  const rootGetters = sbp('state/vuex/getters')
  const firedMap = rootState.periodicNotificationAlreadyFiredMap.alreadyFired
  const lastRunMap = rootState.periodicNotificationAlreadyFiredMap.lastRun
  const callWithStates = (func, stateKey) => func.call(ephemeralNotificationState.partition[stateKey], { rootState, rootGetters })

  // Exit if a timeout is already set
  if (ephemeralNotificationState.clearTimeout) return
  // Prevent accidentally calling `runNotificationListRecursive` while it's
  // still running
  const noop = () => {}
  ephemeralNotificationState.clearTimeout = noop

  /* await Promise.all(
    Object.keys(sbp('okTurtles.eventQueue/queuedInvocations')).map(queue => sbp('okTurtles.eventQueue/queueEvent', noop))
  ) */

  // Check if enough time has passed since the last run
  for (const entry of ephemeralNotificationState.notifications) {
    const stateKey = entry.stateKey
    const lastRun = lastRunMap[stateKey] || 0
    // Use the delay from the notification entry
    const delay = entry.delay
    if ((Date.now() - lastRun) >= delay) {
      try {
        if (!firedMap[stateKey] && callWithStates(entry.emitCondition, stateKey)) {
          await callWithStates(entry.emit, stateKey)
          firedMap[stateKey] = true
        }

        if (firedMap[stateKey] && callWithStates(entry.shouldClearStateKey, stateKey)) {
          delete firedMap[stateKey]
        }
      } catch (e) {
        console.error('runNotificationListRecursive: Error calling notification', stateKey, e)
      }

      // Update the last run timestamp
      lastRunMap[stateKey] = Date.now()
    }
  }

  // Set a timeout for the next run of the notification check
  // But only do so if `clearTimeout` hasn't been reset
  if (ephemeralNotificationState.clearTimeout !== noop) return
  ephemeralNotificationState.clearTimeout = (() => {
    const timeoutId = setTimeout(
      () => {
        delete ephemeralNotificationState.clearTimeout
        runNotificationListRecursive()
      },
      1 * MINS_MILLIS
    )
    return () => clearTimeout(timeoutId)
  })()
}

function clearTimeoutObject () {
  if (ephemeralNotificationState.clearTimeout) {
    ephemeralNotificationState.clearTimeout()
    delete ephemeralNotificationState.clearTimeout
  }
  ephemeralNotificationState.state = Object.create(null)
  ephemeralNotificationState.notifications.forEach(({ stateKey }) => {
    ephemeralNotificationState.partition[stateKey] = Object.create(null)
  })
}

sbp('sbp/selectors/register', {
  'gi.periodicNotifications/init': function () {
    runNotificationListRecursive().catch((e) => {
      console.error('[gi.periodicNotifications/init] Error', e)
    })
  },
  'gi.periodicNotifications/clearStatesAndStopTimers': function () {
    const rootState = sbp('state/vuex/state')

    rootState.periodicNotificationAlreadyFiredMap = {
      alreadyFired: Object.create(null), // { notificationKey: boolean },
      lastRun: Object.create(null) // { notificationKey: number },
    }
    clearTimeoutObject()
  },
  'gi.periodicNotifications/importNotifications': function (entries) {
    const keySet = new Set()
    for (const { type, notificationData } of entries) {
      if (!type || !notificationData) throw new Error('A required field in a periodic notification entry is missing.')

      const delay = delayToObjectMap[type]
      if (!delay) {
        throw new RangeError('Invalid delay')
      }

      validateNotificationData(notificationData)
      if (keySet.has(notificationData.stateKey)) {
        throw new Error('Duplicate periodic notification state key: ' + notificationData.stateKey)
      }
      keySet.add(notificationData.stateKey)

      ephemeralNotificationState.partition[notificationData.stateKey] = Object.create(null)
      ephemeralNotificationState.notifications.push({
        ...notificationData,
        delay
      })
    }
  }
})
