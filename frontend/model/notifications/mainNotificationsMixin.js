'use strict'

import sbp from '@sbp/sbp'
import { PERIODIC_NOTIFICATION_TYPE } from './periodicNotifications.js'
import { compareISOTimestamps, comparePeriodStamps, dateToPeriodStamp, DAYS_MILLIS, MONTHS_MILLIS } from '@model/contracts/shared/time.js'
import { STATUS_OPEN } from '@model/contracts/shared/constants.js'

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
    - name: An optional identifier of the entry.
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
        const currentPeriod = rootGetters.groupSettings?.distributionDate
        if (!currentPeriod) { return false }

        const nextPeriod = rootGetters.periodAfterPeriod(currentPeriod)
        const now = new Date().toISOString()
        const comparison = comparePeriodStamps(nextPeriod, now)

        return rootGetters.ourGroupProfile?.incomeDetailsType === 'pledgeAmount' &&
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

        const currentPeriod = rootGetters.groupSettings?.distributionDate
        return currentPeriod &&
          comparePeriodStamps(dateToPeriodStamp(new Date()), currentPeriod) > 0 &&
          !myNotificationHas(item => item.type === 'NEW_DISTRIBUTION_PERIOD' && item.data.period === currentPeriod)
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
  },
  {
    type: PERIODIC_NOTIFICATION_TYPE.MIN15,
    notificationData: {
      stateKey: 'expiringProposals',
      emitCondition ({ rootGetters }) {
        this.expiringProposalsByGroup = rootGetters.groupsByName.map(group => {
          const { contractID } = group
          const expiringProposals = []
          const groupProposals = rootGetters.groupProposals(contractID) || {}
          for (const proposalId in groupProposals) {
            const proposal = groupProposals[proposalId]
            if (proposal.status === STATUS_OPEN &&
              !proposal.notifiedBeforeExpire &&
              proposal.data.expires_date_ms < (Date.now() + DAYS_MILLIS)) {
              expiringProposals.push({
                proposalId,
                proposalType: proposal.data.proposalType,
                proposalData: proposal.data.proposalData,
                expires_date_ms: proposal.data.expires_date_ms,
                createdDate: proposal.meta.createdDate,
                creator: proposal.meta.username
              })
            }
          }

          return { contractID, proposals: expiringProposals }
        }).filter(entry => entry.proposals.length)

        return this.expiringProposalsByGroup.length
      },
      async emit () {
        for (const { contractID, proposals } of this.expiringProposalsByGroup) {
          await sbp('gi.actions/group/notifyExpiringProposals', {
            contractID,
            data: { proposals }
          })
        }
      },
      shouldClearStateKey: () => true
    }
  }
]

const notificationMixin = {
  methods: {
    initOrResetPeriodicNotifications () {
      if (this.ephemeral.syncs.length) { // If contracts are still syncing, delay the initialisation
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
