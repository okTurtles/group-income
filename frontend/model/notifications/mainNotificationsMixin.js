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
    emitCondition: () => {
      const { ourGroupProfile } = sbp('state/vuex/getters')
      const { incomeDetailsLastUpdatedDate } = (ourGroupProfile || {})
      const now = new Date().toISOString()

      return incomeDetailsLastUpdatedDate &&
        compareISOTimestamps(now, incomeDetailsLastUpdatedDate) > 6 * MONTHS_MILLIS &&
        !myNotificationHas(item => item.type === 'INCOME_DETAILS_OLD' && item.data.lastUpdatedDate === incomeDetailsLastUpdatedDate)
    },
    emit: () => {
      sbp('gi.notifications/emit', 'INCOME_DETAILS_OLD', {
        createdDate: new Date().toISOString(),
        months: 6,
        lastUpdatedDate: sbp('state/vuex/getters').ourGroupProfile.incomeDetailsLastUpdatedDate
      })
    }
  }
]

const periodicNotificationEntries = [
  {
    type: PERIODIC_NOTIFICATION_TYPE.MIN1,
    notificationData: {
      stateKey: 'nearDistributionEnd',
      emitCondition: () => {
        const getters = sbp('state/vuex/getters')
        const currentPeriod = getters.groupSettings.distributionDate
        const nextPeriod = getters.periodAfterPeriod(currentPeriod)
        const now = new Date().toISOString()

        return getters.ourGroupProfile.incomeDetailsType === 'pledgeAmount' &&
          comparePeriodStamps(nextPeriod, now) < DAYS_MILLIS * 7 &&
          (getters.ourPayments && getters.ourPayments.todo.length > 0) &&
          !myNotificationHas(item => item.type === 'NEAR_DISTRIBUTION_END' && item.data.period === currentPeriod)
      },
      emit: () => {
        sbp('gi.notifications/emit', 'NEAR_DISTRIBUTION_END', {
          createdDate: new Date().toISOString(),
          groupID: sbp('state/vuex/state').currentGroupId,
          period: sbp('state/vuex/getters').groupSettings.distributionDate
        })
      },
      shouldClearStateKey: () => false
      // once 'NEAR_DISTRIBUTION_END' is sent, don't clear the stateKey so the emitCondition doesn't get executed over and over again unecessarily.
    }
  }
]

const notificationMixin = {
  methods: {
    initOrResetPeriodicNotifications () {
      console.log('@@@ init or reset!!')

      sbp('gi.periodicNotifications/destroyAll') // make sure to destroy the recursive timeout loop for previous user, if any.
      sbp('gi.periodicNotifications/init')
    },
    async checkAndEmitOneTimeNotifications () {
      for (const entry of oneTimeNotificationEntries) {
        if (entry.emitCondition()) {
          await entry.emit()
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
