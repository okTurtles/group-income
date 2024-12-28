'use strict'

import { compareISOTimestamps, dateToPeriodStamp, MONTHS_MILLIS } from '@model/contracts/shared/time.js'
import sbp from '@sbp/sbp'
import { PERIODIC_NOTIFICATION_TYPE } from './periodicNotifications.js'

// util functions
const myNotificationHas = (checkFunc, groupId = '') => {
  const myNotifications = groupId
    ? sbp('state/vuex/getters').notificationsByGroup(groupId)
    : sbp('state/vuex/getters').currentNotifications

  return myNotifications.some(item => checkFunc(item))
}

/*

 *** NOTE: This mixin is imported into the root Vue instance in 'main.js'. feel free to extend the notification entry lists
           for defining more notifications.

  There is two types of notifications that can be defined here.
  1) one-time notification: A type of notification that is checked & emitted once when user has signed in on their group.
                            (Executed in response to 'SWITCH_GROUP' event)
  2) periodic notification: A type of notication that is checked periodically and emitted when the conditions are met.

  *-*-*-* notification entry structure *-*-*-*

  1. oneTimeNotification: { name?: string, emitCondition: function, emit: function }
    - name: An optional identifier of the entry.
    - emitCondition: a function that returns a boolean that determines whether or not to emit a notification
    - emit: logic to emit a notification

  2. periodicNotification: { type: string, notificationData: object }
    * type: MIN1 | MIN5 | MIN30
      - MIN1: a notification that is validated&emitted every 1 min.
      - MIN5: a notification that is validated&emitted every 5 min.
      - MIN15: a notification that is validated&emitted every 15 min.
      - MIN30: a notification that is validated&emitted every 30 min.

    * notificationData: { stateKey: string, emitCondition: function, emit: function, shouldClearStateKey: function }
      - stateKey: a key name used to store a boolean in rootState.periodicNotificationAlreadyFiredMap.
                  Being undefined in the rootState means the notification hasn't been fired, and setting it to 'true' means it has.
      - emitCondition: a function that returns a boolean that determines whether or not to emit a notification
      - emit: logic to emit a notification
      - shouldClearStateKey: a function that returns true to delete the stateKey from rootState, which marks the notification as 'has not been fired' again.

  *-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-**-*-*
*/
const oneTimeNotificationEntries = [
  {
    name: 'INCOME_DETAILS_OLD',
    emitCondition ({ rootGetters }) {
      const { incomeDetailsLastUpdatedDate } = (rootGetters.ourGroupProfile || {})
      const now = dateToPeriodStamp(new Date())

      return incomeDetailsLastUpdatedDate &&
        compareISOTimestamps(now, incomeDetailsLastUpdatedDate) > 6 * MONTHS_MILLIS &&
        !myNotificationHas(item => item.type === 'INCOME_DETAILS_OLD' && item.data.lastUpdatedDate === incomeDetailsLastUpdatedDate)
    },
    emit ({ rootGetters }) {
      sbp('gi.notifications/emit', 'INCOME_DETAILS_OLD', {
        months: 6,
        lastUpdatedDate: rootGetters.ourGroupProfile.incomeDetailsLastUpdatedDate
      })
    }
  }
]

const periodicNotificationEntries = [
  // The following fixes a rare issue that we're not sure exactly why it happens.
  // Sometimes, the `namespace/lookup` call made as a side-effect in the identity
  // contract seems to fail. The result of this is that the corresponding cached
  // namespace lookup entry isn't populated and the username is missing from the
  // UI. To fix this, we check for users that are missing a username and
  // do this lookup manually.
  // See: <https://github.com/okTurtles/group-income/pull/2306#pullrequestreview-2305605028>
  {
    type: PERIODIC_NOTIFICATION_TYPE.MIN30,
    notificationData: {
      stateKey: 'username-fetch',
      emitCondition: () => true,
      emit ({ rootState, rootGetters }) {
        Object.values(rootGetters.ourContactProfilesById)
          // Only get users that are missing the cached lookup entry (!username)
          // and that have a username defined (!!rootState[contractID]?.attributes?.username)
          .filter(
            // $FlowFixMe[incompatible-use]
            ({ username, contractID }) => !username && !!rootState[contractID]?.attributes?.username)
          // $FlowFixMe[incompatible-use]
          .forEach(({ contractID }) => {
            const username = rootState[contractID].attributes.username
            // Do a manual lookup. This will populate the cache if successful.
            sbp('namespace/lookup', username, { skipCache: true }).then((cID) => {
              if (cID !== contractID) {
                console.error(`[periodic notification] Mismatched username. The lookup result was ${cID} instead of ${contractID}`)
              }
            }).catch((e) => {
              console.error('[periodic notification] Error looking up username', username, 'for', contractID, e)
            })
          })
      },
      shouldClearStateKey: () => true
    }
  }
]

const notificationMixin = {
  methods: {
    getPendingQueuedInvocationsCount (): number {
      return Object.entries(sbp('okTurtles.eventQueue/queuedInvocations'))
        .flatMap(([, list]) => list).length
    },
    initOrResetPeriodicNotifications () {
      if (this.getPendingQueuedInvocationsCount() > 0) {
        setTimeout(() => this.initOrResetPeriodicNotifications(), 1000)
        return
      }

      // make sure clear the states and timers for either previous user or previous group of the user, and re-init them.
      sbp('gi.periodicNotifications/clearStatesAndStopTimers')
      sbp('gi.periodicNotifications/init')
    },
    async checkAndEmitOneTimeNotifications () {
      const arg = { rootState: sbp('state/vuex/state'), rootGetters: sbp('state/vuex/getters') }

      for (const entry of oneTimeNotificationEntries) {
        if (entry.emitCondition(arg)) {
          await entry.emit(arg)
        }
      }
    }
  },
  mounted () {
    sbp('gi.periodicNotifications/importNotifications', periodicNotificationEntries)
  }
}

export default notificationMixin
