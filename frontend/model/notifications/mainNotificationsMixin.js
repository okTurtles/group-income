'use strict'

import sbp from '@sbp/sbp'
import { PERIODIC_NOTIFICATION_TYPE } from './periodicNotifications.js'
import { compareISOTimestamps, comparePeriodStamps, dateToPeriodStamp, DAYS_MILLIS, MONTHS_MILLIS } from '@model/contracts/shared/time.js'
import { STATUS_OPEN, PROPOSAL_GENERIC } from '@model/contracts/shared/constants.js'
import { extractProposalData } from './utils.js'

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
  {
    type: PERIODIC_NOTIFICATION_TYPE.MIN1,
    notificationData: {
      stateKey: 'nearDistributionEnd',
      emitCondition ({ rootState, rootGetters }) {
        const identityContractID = rootState.loggedIn?.identityContractID
        if (!identityContractID) return

        const groupIds = Object.keys(rootState[identityContractID].groups).filter((gId) => !rootState[identityContractID].groups[gId].hasLeft && rootState[gId])

        this.nearDistributionEnd = groupIds.map((gId) => {
          /// TODO REVERT TO USE getter
          const currentPeriod = rootGetters.groupSettingsForGroup(rootState[gId]).distributionDate
          if (!currentPeriod) { return false }

          const nextPeriod = rootGetters.periodAfterPeriodForGroup(rootState[gId], currentPeriod)
          const now = dateToPeriodStamp(new Date())
          const comparison = comparePeriodStamps(nextPeriod, now)

          return rootGetters.ourGroupProfileForGroup(rootState[gId]).incomeDetailsType === 'pledgeAmount' &&
            (comparison > 0 && comparison < DAYS_MILLIS * 7) &&
            (rootGetters.ourPaymentsForGroup(rootState[gId])?.todo.length > 0) &&
            !myNotificationHas(item => item.type === 'NEAR_DISTRIBUTION_END' && item.data.period === currentPeriod, gId)
            ? [gId, currentPeriod]
            : null
        }).filter(Boolean)

        return (this.nearDistributionEnd.length > 0)
      },
      emit ({ rootState, rootGetters }) {
        this.nearDistributionEnd.forEach(([groupID, period]) => {
          sbp('gi.notifications/emit', 'NEAR_DISTRIBUTION_END', {
            groupID,
            period
          })
        })
      },
      shouldClearStateKey ({ rootState, rootGetters }) {
        const identityContractID = rootState.loggedIn?.identityContractID
        if (!identityContractID) return

        const groupIds = Object.keys(rootState[identityContractID].groups).filter((gId) => !rootState[identityContractID].groups[gId].hasLeft && rootState[gId])

        const groupedNotifications = rootGetters.notifications.filter(item => item.type === 'NEAR_DISTRIBUTION_END').reduce((acc, item) => {
          if (!item.groupID) return acc
          if (!acc[item.groupID]) acc[item.groupID] = []
          acc[item.groupID].push(item.data.period)

          return acc
        }, Object.create(null))

        return groupIds.every((groupId) => {
          const currentPeriod = rootGetters.groupSettingsForGroup(groupId).distributionDate
          return !!groupedNotifications[groupId]?.every(period => period !== currentPeriod)
        })
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
          groupID: rootState.currentGroupId,
          period: rootGetters.groupSettings.distributionDate,
          creatorID: rootGetters.ourIdentityContractId,
          memberType: rootGetters.ourGroupProfile.incomeDetailsType === 'pledgeAmount' ? 'pledger' : 'receiver'
        })
      },
      shouldClearStateKey ({ rootGetters }) {
        return comparePeriodStamps(dateToPeriodStamp(new Date()), rootGetters.groupSettings.distributionDate) > 0
      }
    }
  },
  {
    type: PERIODIC_NOTIFICATION_TYPE.MIN5,
    notificationData: {
      stateKey: 'expiringOrExpiredProposals',
      emitCondition ({ rootGetters }) {
        this.expiringOrExpiredProposalsByGroup = rootGetters.groupsByName.map(group => {
          const { contractID } = group
          const expiredProposalIds = []
          const expiringProposals = []
          const groupNotificationItems = []
          const groupProposals = rootGetters.groupProposals(contractID) || {}

          for (const proposalId in groupProposals) {
            const proposal = groupProposals[proposalId]
            if (proposal.status !== STATUS_OPEN) { continue }

            if (proposal.data.expires_date_ms < Date.now()) { // the proposal has already expired
              expiredProposalIds.push(proposalId)
            } else if (proposal.data.expires_date_ms < (Date.now() + DAYS_MILLIS)) { // the proposal is going to expire in next 24 hrs
              if (!proposal.notifiedBeforeExpire) { // there is no group-chat notification sent for this proposal
                expiringProposals.push(extractProposalData(proposal, { proposalId }))
              }

              if (!Object.keys(proposal.votes).includes(rootGetters.ourIdentityContractId) && // check if the user hasn't voted for this proposal.
                !myNotificationHas(item => item.type === 'PROPOSAL_EXPIRING' && item.data.proposalId === proposalId, contractID) // the user hasn't received the pop-up notification.
              ) {
                groupNotificationItems.push({
                  proposalId,
                  creatorID: proposal.creatorID,
                  proposalType: proposal.data.proposalType,
                  proposalData: proposal.data.proposalData
                })
              }
            }
          }

          return { contractID, expiringProposals, groupNotificationItems, expiredProposalIds }
        }).filter(entry => entry.expiringProposals.length || entry.groupNotificationItems.length || entry.expiredProposalIds.length)

        return this.expiringOrExpiredProposalsByGroup.length
      },
      async emit () {
        for (const { contractID, expiringProposals, groupNotificationItems, expiredProposalIds } of this.expiringOrExpiredProposalsByGroup) {
          if (expiringProposals.length) {
            await sbp('gi.actions/group/notifyExpiringProposals', {
              contractID,
              data: { proposals: expiringProposals }
            })
          }

          if (groupNotificationItems.length) {
            groupNotificationItems.forEach(proposal => {
              sbp('gi.notifications/emit', 'PROPOSAL_EXPIRING', {
                groupID: contractID,
                creatorID: proposal.creatorID,
                proposalId: proposal.proposalId,
                proposalType: proposal.proposalType,
                proposalData: proposal.proposalData,
                title: proposal.proposalType === PROPOSAL_GENERIC ? proposal.proposalData.name : ''
              })
            })
          }

          if (expiredProposalIds.length) {
            sbp('gi.actions/group/markProposalsExpired', {
              contractID,
              data: { proposalIds: expiredProposalIds }
            })
              .catch((e) => {
                console.error('Error calling markProposalsExpired from notifications mixin', e)
              })
          }
        }
      },
      shouldClearStateKey: () => true
    }
  },
  {
    type: PERIODIC_NOTIFICATION_TYPE.MIN5,
    notificationData: {
      stateKey: 'lastLoggedIn',
      emitCondition ({ rootGetters }) {
        return !!rootGetters.ourIdentityContractId
      },
      emit ({ rootState, rootGetters }) {
        Promise.all(
          rootGetters.groupsByName.filter(({ active }) => active).map(({ contractID }) => {
            return sbp('gi.actions/group/kv/updateLastLoggedIn', {
              contractID,
              throttle: true
            })
          })
        ).catch((e) => {
          console.error('Error updating lastLoggedIn', e)
        })
      },
      shouldClearStateKey: () => true
    }
  },
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
