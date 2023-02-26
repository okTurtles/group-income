'use strict'

import sbp from '@sbp/sbp'
import { PERIODIC_NOTIFICATION_TYPE } from './periodicNotifications/constants.js'
import { compareISOTimestamps, comparePeriodStamps, DAYS_MILLIS, MONTHS_MILLIS } from '@model/contracts/shared/time.js'

// util functions
const myNotificationHas = checkFunc => {
  return sbp('state/vuex/getters').currentNotifications.some(item => checkFunc(item))
}

/*
 *** NOTE: This mixin is imported into the root Vue instance in 'main.js'. feel free to extend the notification entry lists
           for defining more notifications

  There is two types of notifications that can be defined here.
  1) one-time notification: A type of notification that is checked & emitted once when user has signed in on their group.
                            (Executed in response to 'SWITCH_GROUP' event)
  2) periodic notification: A type of notication that is checked periodically and emitted when the conditions are met.

  *-*-*-* notification entry structure *-*-*-*

  1. oneTimeNotification: { name?: string, emitCondition: function, emit: function }
    - name: An optional identifier of the entry
    - emitCondition: a function that returns a boolean that determines whether or not to emit a notification
    - emit: logic to emit a notification

  2. periodicNotification: { type: string, notificationData: object }
    * type: MIN1 | MIN5 | MIN30
      - MIN1: a notification that is validated&emitted every 1 min.
      - MIN5: a notification that is validated&emitted every 5 min.
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
      const now = new Date().toISOString()

      return incomeDetailsLastUpdatedDate &&
        compareISOTimestamps(now, incomeDetailsLastUpdatedDate) > 6 * MONTHS_MILLIS &&
        !myNotificationHas(item => item.type === 'INCOME_DETAILS_OLD' && item.data.lastUpdatedDate === incomeDetailsLastUpdatedDate)
    },
    emit ({ rootGetters }) {
      sbp('gi.notifications/emit', 'INCOME_DETAILS_OLD', {
        createdDate: new Date().toISOString(),
        months: 6,
        lastUpdatedDate: rootGetters.ourGroupProfile.incomeDetailsLastUpdatedDate
      })
    }
  }
]

const periodicNotificationEntries = [
  {
    type: PERIODIC_NOTIFICATION_TYPE.MIN1,
    notificationData: {
      stateKey: 'nearDistributionEnd',
      emitCondition ({ rootGetters }) {
        if (!rootGetters.groupSettings.distributionDate) { return false }

        const currentPeriod = rootGetters.groupSettings.distributionDate
        const nextPeriod = rootGetters.periodAfterPeriod(currentPeriod)
        const now = new Date().toISOString()
        const comparison = comparePeriodStamps(nextPeriod, now)

        return rootGetters.ourGroupProfile.incomeDetailsType === 'pledgeAmount' &&
          (comparison > 0 && comparison < DAYS_MILLIS * 7) &&
          (rootGetters.ourPayments && rootGetters.ourPayments.todo.length > 0) &&
          !myNotificationHas(item => item.type === 'NEAR_DISTRIBUTION_END' && item.data.period === currentPeriod)
      },
      emit ({ rootState, rootGetters }) {
        sbp('gi.notifications/emit', 'NEAR_DISTRIBUTION_END', {
          createdDate: new Date().toISOString(),
          groupID: rootState.currentGroupId,
          period: rootGetters.groupSettings.distributionDate
        })
      },
      shouldClearStateKey ({ rootGetters }) {
        const currentPeriod = rootGetters.groupSettings.distributionDate
        return rootGetters.currentNotifications.filter(item => item.type === 'NEAR_DISTRIBUTION_END')
          .every(item => item.data.period !== currentPeriod)
      }
    }
  },
  {
    type: PERIODIC_NOTIFICATION_TYPE.MIN1,
    notificationData: {
      stateKey: 'nextDistributionPeriod',
      emitCondition ({ rootGetters }) {
        if (!rootGetters.ourGroupProfile?.incomeDetailsType) return false // if income-details are not set yet, ignore.

        const currentPeriod = rootGetters.groupSettings.distributionDate
        const now = new Date().toISOString()
        let check = false

        if (this.distPeriodRecords &&
          comparePeriodStamps(this.distPeriodRecords.prevPeriod, this.distPeriodRecords.prevNow) > 0 &&
          comparePeriodStamps(currentPeriod, now) < 0) { check = true }

        if (this.distPeriodRecords && comparePeriodStamps(currentPeriod, this.distPeriodRecords.prevPeriod) > 0) { check = true }

        this.distPeriodRecords = {
          prevPeriod: currentPeriod,
          prevNow: now
        }

        return check
      },
      emit ({ rootState, rootGetters }) {
        sbp('gi.notifications/emit', 'NEW_DISTRIBUTION_PERIOD', {
          createdDate: new Date().toISOString(),
          groupID: rootState.currentGroupId,
          creator: rootGetters.ourUsername,
          memberType: rootGetters.ourGroupProfile.incomeDetailsType === 'pledgeAmount' ? 'pledger' : 'receiver'
        })
      },
      shouldClearStateKey ({ rootGetters }) {
        return comparePeriodStamps(new Date().toISOString(), rootGetters.groupSettings.distributionDate) > 0
      }
    }
  }
]

const notificationMixin = {
  methods: {
    initOrResetPeriodicNotifications () {
      sbp('gi.periodicNotifications/destroyAll') // make sure to destroy the recursive timeout loop for previous user, if any.
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
    for (const entry of periodicNotificationEntries) {
      sbp('gi.periodicNotifications/createEntry', entry)
    }
  }
}

export default notificationMixin
