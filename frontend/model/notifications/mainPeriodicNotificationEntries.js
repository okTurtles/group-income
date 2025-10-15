import { PROPOSAL_GENERIC, STATUS_OPEN } from '@model/contracts/shared/constants.js'
import { DAYS_MILLIS, comparePeriodStamps, dateToPeriodStamp } from '@model/contracts/shared/time.js'
import sbp from '@sbp/sbp'
import { PERIODIC_NOTIFICATION_TYPE } from './periodicNotifications.js'
import { extractProposalData } from './utils.js'

// util functions
const myNotificationHas = (checkFunc, groupId = '') => {
  const myNotifications = groupId
    ? sbp('state/vuex/getters').notificationsByGroup(groupId)
    : sbp('state/vuex/getters').currentNotifications

  return myNotifications.some(item => checkFunc(item))
}

const periodicNotificationEntries: {
  type: string;
  notificationData: {
    stateKey: string;
    emitCondition: (arg: { rootState: Object, rootGetters: Object }) => boolean;
    emit: (arg: { rootState: Object, rootGetters: Object }) => void | Promise<void>;
    shouldClearStateKey: (arg: { rootState: Object, rootGetters: Object }) => boolean;
  }
}[] = [
  {
    type: PERIODIC_NOTIFICATION_TYPE.MIN15,
    notificationData: {
      stateKey: 'nearDistributionEnd',
      emitCondition ({ rootState, rootGetters }) {
        const groupIds = rootGetters.ourGroups

        this.nearDistributionEnd = groupIds.map((gId) => {
          const currentPeriod = rootGetters.groupSettingsForGroup(rootState[gId]).distributionDate
          if (!currentPeriod) { return null }

          const nextPeriod = rootGetters.periodAfterPeriodForGroup(rootState[gId], currentPeriod)
          const now = dateToPeriodStamp(new Date())
          const comparison = comparePeriodStamps(nextPeriod, now)

          return (
            rootGetters.ourGroupProfileForGroup(rootState[gId])?.incomeDetailsType === 'pledgeAmount' &&
              (comparison > 0 && comparison < DAYS_MILLIS * 7) &&
              (rootGetters.ourPaymentsForGroup(rootState[gId])?.todo.length > 0) &&
              !myNotificationHas(item => item.type === 'NEAR_DISTRIBUTION_END' && item.data.period === currentPeriod, gId)
          )
            ? [gId, currentPeriod]
            : null
        }).filter(Boolean)

        return (this.nearDistributionEnd.length > 0)
      },
      emit () {
        this.nearDistributionEnd.forEach(([groupID, period]) => {
          sbp('gi.notifications/emit', 'NEAR_DISTRIBUTION_END', {
            groupID,
            period
          })
        })
      },
      shouldClearStateKey ({ rootGetters }) {
        const groupIds = rootGetters.ourGroups

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
    type: PERIODIC_NOTIFICATION_TYPE.MIN5,
    notificationData: {
      stateKey: 'nextDistributionPeriod',
      emitCondition ({ rootState, rootGetters }) {
        const groupIds = rootGetters.ourGroups

        this.nextDistributionPeriod = groupIds.map((gId) => {
          const profile = rootGetters.ourGroupProfileForGroup(rootState[gId])
          if (!profile?.incomeDetailsType) {
            // if income-details are not set yet, ignore.
            return null
          }
          const currentPeriod = rootGetters.groupSettingsForGroup(rootState[gId]).distributionDate
          if (!currentPeriod) { return null }

          const nextPeriod = rootGetters.periodAfterPeriodForGroup(rootState[gId], currentPeriod)
          const now = dateToPeriodStamp(new Date())
          const isPeriodRelevant = comparePeriodStamps(now, currentPeriod) > 0 && comparePeriodStamps(now, nextPeriod) < 0

          return (
            isPeriodRelevant &&
              !myNotificationHas(item => item.type === 'NEW_DISTRIBUTION_PERIOD' && item.data.period === currentPeriod, gId)
          )
            ? [gId, currentPeriod, profile.incomeDetailsType]
            : null
        }).filter(Boolean)

        return (this.nextDistributionPeriod.length > 0)
      },
      emit ({ rootGetters }) {
        const creatorID = rootGetters.ourIdentityContractId
        this.nextDistributionPeriod.forEach(([groupID, period, incomeDetailsType]) => {
          sbp('gi.notifications/emit', 'NEW_DISTRIBUTION_PERIOD', {
            groupID,
            period,
            creatorID,
            memberType: incomeDetailsType === 'pledgeAmount' ? 'pledger' : 'receiver'
          })
        })
      },
      shouldClearStateKey ({ rootState, rootGetters }) {
        const groupIds = rootGetters.ourGroups

        return groupIds.every((groupId) => {
          return comparePeriodStamps(dateToPeriodStamp(new Date()), rootGetters.groupSettingsForGroup(rootState[groupId]).distributionDate) > 0
        })
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
  }
]

export default periodicNotificationEntries
