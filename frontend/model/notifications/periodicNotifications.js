'use strict'

import sbp from '@sbp/sbp'
// $FlowFixMe
import { isFunction, objectOf, string } from '@model/contracts/misc/flowTyper.js'
import { MINS_MILLIS } from '@model/contracts/shared/time.js'

// This file is used in both the SW and window contexts.
// We do not import Vue for two reasons:
//   (1) it's bulk that's not needed in the SW, and
//   (2) there is no place in the app to re-render in response to state updates
//       in `alreadyFired` and `lastRun`

let shortestDelay: number
export const PERIODIC_NOTIFICATION_TYPE = {
  MIN1: '1MIN',
  MIN5: '5MIN',
  MIN15: '15MIN',
  MIN30: '30MIN'
}

const ephemeralNotificationState: {
  notifications: any[], partition: Object, clearTimeout?: Function
} = {
  notifications: [], partition: Object.create(null)
}

const typeToDelayMap = {
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
  // We set `clearTimeout` to a local value to stop processing notifications
  // when clearing stop notifications, to avoid calling
  // `runNotificationListRecursive` while it's running and to be able to compare
  // it to the local value later to replace `clearTimeout` later on in this
  // function
  let aborted: boolean = false
  const abort = () => { aborted = true }
  ephemeralNotificationState.clearTimeout = abort

  // If there are any queued invocations, wait until they're done
  // This is needed because some of the notifications might need contract state
  // to be ready. By waiting on all queues, we ensure that we have the latest
  // state after setting up Chelonia. When periodic notifications were used
  // only in the browser window (instead of also in the SW), a timeout was used
  // for a similar effect.
  await Promise.all(
    ((Object.entries(sbp('okTurtles.eventQueue/queuedInvocations')): any): [string, (Function | string[])[]])
      .map(([queue, invocations]) => {
        return !!invocations.length && sbp('okTurtles.eventQueue/queueEvent', queue, () => {}).catch(() => {})
      })
  )

  // Check if enough time has passed since the last run
  for (const entry of ephemeralNotificationState.notifications) {
    if (aborted) break
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
  if (ephemeralNotificationState.clearTimeout !== abort) return
  ephemeralNotificationState.clearTimeout = (() => {
    const timeoutId = setTimeout(
      () => {
        delete ephemeralNotificationState.clearTimeout
        runNotificationListRecursive()
      },
      shortestDelay
    )
    return () => clearTimeout(timeoutId)
  })()
}

function clearTimeoutObject () {
  if (ephemeralNotificationState.clearTimeout) {
    ephemeralNotificationState.clearTimeout()
    delete ephemeralNotificationState.clearTimeout
  }

  ephemeralNotificationState.notifications.forEach(({ stateKey }) => {
    ephemeralNotificationState.partition[stateKey] = Object.create(null)
  })
}

sbp('sbp/selectors/register', {
  'gi.periodicNotifications/init': function () {
    return runNotificationListRecursive().catch((e) => {
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

      const delay = typeToDelayMap[type]
      if (!delay) {
        throw new RangeError('Invalid delay')
      }
      // Using inverted logic because `shortestDelay` could be undefined (on
      // the first call to this function) and `undefined` is coerced to NaN.
      if (!(shortestDelay <= delay)) shortestDelay = delay

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
