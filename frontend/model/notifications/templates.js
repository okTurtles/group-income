import { GIMessage } from '~/shared/domains/chelonia/chelonia.js'
import type {
  NewProposalType,
  NotificationTemplate
} from './types.flow.js'

import sbp from '@sbp/sbp'
import { L, LTags } from '@common/common.js'
import { humanDate } from '@model/contracts/shared/time.js'
import {
  STATUS_PASSED, STATUS_FAILED, STATUS_CANCELLED, STATUS_EXPIRED,
  PROPOSAL_INVITE_MEMBER, PROPOSAL_REMOVE_MEMBER,
  PROPOSAL_GROUP_SETTING_CHANGE, PROPOSAL_PROPOSAL_SETTING_CHANGE, PROPOSAL_GENERIC
} from '@model/contracts/shared/constants.js'
import { getProposalDetails } from '@model/contracts/shared/functions.js'

const contractName = (contractID) => sbp('state/vuex/state').contracts[contractID]?.type ?? contractID
const userDisplayNameFromID = (userID) => sbp('state/vuex/getters').userDisplayNameFromID(userID)
// Note: this escaping is not intended as a protection against XSS.
// It is only done to enable correct rendering of special characters in usernames.
// To guard against XSS when rendering usernames, use the `v-safe-html` directive.
const escapeForHtml = (text) => text.replace(/[<>&]/g, (c) => ('&#' + c.codePointAt(0) + ';'))
const strong = (text) => `<strong>${escapeForHtml(text)}</strong>`

export default ({
  CHELONIA_ERROR (data: { activity: string, error: Error, message: GIMessage }) {
    const { activity, error, message } = data
    const contractID = message.contractID()
    const opType = message.opType()
    const value = message.decryptedValue()
    let action
    let meta
    if ([GIMessage.OP_ACTION_ENCRYPTED, GIMessage.OP_ACTION_UNENCRYPTED].includes(opType) && value) {
      action = value.action
      meta = value.meta
    }
    return {
      body: L("{errName} during {activity} for '{action}' from {b_}{who}{_b} to '{contract}': '{errMsg}'", {
        ...LTags('b'),
        errName: error.name,
        activity,
        action: action ?? opType,
        who: meta?.username ?? message.signingKeyId(),
        contract: contractName(contractID),
        errMsg: error.message ?? '?'
      }),
      icon: 'exclamation-triangle',
      level: 'danger',
      linkTo: `/app/dashboard?modal=UserSettingsModal&tab=application-logs&errorMsg=${encodeURI(error.message)}`,
      scope: 'app'
    }
  },
  GENERAL (data: { contractID: string, message: string }) {
    return {
      body: data.message,
      icon: 'cog',
      level: 'info',
      linkTo: '',
      scope: 'app'
    }
  },
  WARNING (data: { contractID: string, message: string }) {
    return {
      body: data.message,
      icon: 'exclamation-triangle',
      level: 'danger',
      linkTo: '',
      scope: 'app'
    }
  },
  ERROR (data: { contractID: string, message: string }) {
    return {
      body: data.message,
      icon: 'exclamation-triangle',
      level: 'danger',
      linkTo: `/app/dashboard?modal=UserSettingsModal&tab=application-logs&errorMsg=${encodeURI(data.message)}`,
      scope: 'app'
    }
  },
  CONTRIBUTION_REMINDER (data: { date: string }) {
    return {
      body: L('Do not forget to send your pledge by {date}.', {
        date: strong(data.date)
      }),
      icon: 'coins',
      level: 'info',
      linkTo: '/payments',
      scope: 'user'
    }
  },
  INCOME_DETAILS_OLD (data: { months: number, lastUpdatedDate: string }) {
    return {
      body: L("You haven't updated your income details in more than {months} months. Would you like to review them now?", {
        // Avoid displaying decimals.
        months: Math.floor(data.months)
      }),
      icon: 'coins',
      level: 'info',
      linkTo: '/contributions?modal=IncomeDetails',
      scope: 'user',
      data: { lastUpdatedDate: data.lastUpdatedDate }
    }
  },
  MEMBER_ADDED (data: { groupID: string, memberID: string }) {
    const rootState = sbp('state/vuex/state')
    const name = strong(userDisplayNameFromID(data.memberID))

    return {
      avatarUserID: data.memberID,
      body: L('The group has a new member. Say hi to {name}!', { name }),
      icon: 'user-plus',
      level: 'info',
      linkTo: `/group-chat/${rootState[data.groupID]?.generalChatRoomId}`,
      scope: 'group'
    }
  },
  MEMBER_LEFT (data: { groupID: string, memberID: string }) {
    const name = strong(userDisplayNameFromID(data.memberID))
    return {
      avatarUserID: data.memberID,
      body: L('{name} has left your group. Contributions were updated accordingly.', {
        name
      }),
      icon: 'user-minus',
      level: 'danger',
      linkTo: '/contributions',
      scope: 'group'
    }
  },
  MEMBER_REMOVED (data: { groupID: string, memberID: string }) {
    const name = strong(userDisplayNameFromID(data.memberID))
    return {
      avatarUserID: data.memberID,
      // REVIEW @mmbotelho - Not only contributions, but also proposals.
      body: L('{name} was kicked out of the group. Contributions were updated accordingly.', {
        name
      }),
      icon: 'user-minus',
      level: 'danger',
      linkTo: '/contributions',
      scope: 'group'
    }
  },
  NEW_PROPOSAL (data: { groupID: string, creatorID: string, subtype: NewProposalType }) {
    const name = strong(userDisplayNameFromID(data.creatorID))
    const bodyTemplateMap = {
      ADD_MEMBER: () => L('{name} proposed to add a member to the group. Vote now!', { name }),
      CHANGE_MINCOME: () => L('{name} proposed to change the group mincome. Vote now!', { name }),
      CHANGE_DISTRIBUTION_DATE: () => L('{name} proposed to change the group distribution date. Vote now!', { name }),
      CHANGE_VOTING_RULE: () => L('{name} proposed to change the group voting system. Vote now!', { name }),
      REMOVE_MEMBER: () => L('{name} proposed to remove a member from the group. Vote now!', { name }),
      GENERIC: () => L('{name} created a proposal. Vote now!', { name })
    }

    const iconMap = {
      ADD_MEMBER: 'user-plus',
      CHANGE_MINCOME: 'dollar-sign',
      CHANGE_DISTRIBUTION_DATE: 'chart-pie',
      CHANGE_VOTING_RULE: 'vote-yea',
      REMOVE_MEMBER: 'user-minus',
      GENERIC: 'envelope-open-text'
    }

    return {
      avatarUserID: data.creatorID,
      body: bodyTemplateMap[data.subtype](),
      creatorID: data.creatorID,
      icon: iconMap[data.subtype],
      level: 'info',
      linkTo: '/dashboard#proposals',
      subtype: data.subtype,
      scope: 'group'
    }
  },
  PROPOSAL_EXPIRING (data: { proposalId: string, proposal: Object }) {
    const { proposalData, proposalType } = data.proposal.data
    const typeToTitleMap = {
      [PROPOSAL_INVITE_MEMBER]: L('Member addition'),
      [PROPOSAL_REMOVE_MEMBER]: L('Member removal'),
      [PROPOSAL_GROUP_SETTING_CHANGE]: {
        mincomeAmount: L('Mincome change'),
        distributionDate: L('Distribution date change')
      }[proposalData.setting],
      [PROPOSAL_PROPOSAL_SETTING_CHANGE]: L('Voting rule change'),
      [PROPOSAL_GENERIC]: proposalData.name
    }

    return {
      avatarUserID: '',
      body: L('Proposal about to expire: {i_}"{proposalTitle}"{_i}. Please vote!', {
        ...LTags('i'),
        proposalTitle: typeToTitleMap[proposalType]
      }),
      level: 'info',
      icon: 'exclamation-triangle',
      scope: 'group',
      linkTo: '/dashboard#proposals',
      data: { proposalId: data.proposalId }
    }
  },
  PROPOSAL_CLOSED (data: { proposal: Object }) {
    const { creatorID, status, type, options } = getProposalDetails(data.proposal)

    const bodyTemplateMap = {
      [PROPOSAL_INVITE_MEMBER]:
        (opts) => L('{creator} proposal to add {member} to the group was {closedWith}.', opts),
      [PROPOSAL_REMOVE_MEMBER]:
        (opts) => L('{creator} proposal to remove {member} from the group was {closedWith}.', opts),
      [PROPOSAL_GROUP_SETTING_CHANGE]:
        (opts) => L('{creator} proposal to change group\'s {setting} to {value} was {closedWith}.', opts),
      [PROPOSAL_PROPOSAL_SETTING_CHANGE]:
        (opts) => L('{creator} proposal to change group\'s {setting} was {closedWith}.', opts), // TODO: define message
      [PROPOSAL_GENERIC]:
        (opts) => L('{creator} proposal "{title}" was {closedWith}.', opts)
    }
    const statusMap = {
      [STATUS_PASSED]: { icon: 'check', level: 'success', closedWith: L('accepted') },
      [STATUS_FAILED]: { icon: 'times', level: 'danger', closedWith: L('rejected') },
      [STATUS_CANCELLED]: { icon: 'times', level: 'danger', closedWith: L('cancelled') }, // TODO: define icon, level
      [STATUS_EXPIRED]: { icon: 'times', level: 'danger', closedWith: L('expired') } // TODO: define icon, level
    }

    return {
      avatarUserID: creatorID,
      body: bodyTemplateMap[type]({
        ...options,
        creator: L('{name}\'s', { name: strong(userDisplayNameFromID(creatorID)) }), // TODO: display YOUR
        closedWith: strong(statusMap[status].closedWith)
      }),
      icon: statusMap[status].icon,
      level: statusMap[status].level,
      linkTo: '/dashboard#proposals',
      scope: 'group'
    }
  },
  PAYMENT_RECEIVED (data: { creatorID: string, amount: string, paymentHash: string }) {
    const { userDisplayNameFromID } = sbp('state/vuex/getters')

    return {
      avatarUserID: data.creatorID,
      body: L('{name} sent you a {amount} mincome contribution. {strong_}Review and send a thank you note.{_strong}', {
        name: userDisplayNameFromID(data.creatorID), // displayName of the sender
        amount: data.amount,
        ...LTags('strong')
      }),
      creatorID: data.creatorID,
      icon: '',
      level: 'info',
      linkTo: `/payments?modal=PaymentDetail&id=${data.paymentHash}`,
      scope: 'group'
    }
  },
  PAYMENT_THANKYOU_SENT (data: { creatorID: string, fromMemberID: string, toMemberID: string }) {
    return {
      avatarUserID: data.creatorID,
      body: L('{name} sent you a {strong_}thank you note{_strong} for your contribution.', {
        name: strong(userDisplayNameFromID(data.fromMemberID)),
        ...LTags('strong')
      }),
      creatorID: data.creatorID,
      icon: '',
      level: 'info',
      linkTo: `/payments?modal=ThankYouNoteModal&from=${data.fromMemberID}&to=${data.toMemberID}`,
      scope: 'group'
    }
  },
  MINCOME_CHANGED (data: { creatorID: string, to: number, memberType: string, increased: boolean }) {
    const { withGroupCurrency } = sbp('state/vuex/getters')
    return {
      avatarUserID: data.creatorID,
      body: L('The mincome has changed to {amount}.', { amount: withGroupCurrency(data.to) }),
      creatorID: data.creatorID,
      icon: 'dollar-sign',
      level: 'info',
      scope: 'group',
      sbpInvocation: ['gi.actions/group/displayMincomeChangedPrompt', {
        contractID: sbp('state/vuex/state').currentGroupId,
        data: {
          amount: data.to,
          memberType: data.memberType,
          increased: data.increased
        }
      }]
    }
  },
  NEW_DISTRIBUTION_PERIOD (data: { creatorID: string, memberType: string }) {
    const distPeriod = sbp('state/vuex/getters').groupSettings?.distributionDate
    const periodDisplay = humanDate(distPeriod, { month: 'short', day: 'numeric', year: 'numeric' })
    const bodyTemplate = {
      // Display the distribution period in the notification message (issue: https://github.com/okTurtles/group-income/issues/1903)
      'pledger': L('A new distribution period ({period}) has started. Please check Payment TODOs.', { period: periodDisplay }),
      'receiver': L('A new distribution period ({period}) has started. Please update your income details if they have changed.', { period: periodDisplay })
    }

    return {
      avatarUserID: data.creatorID,
      body: bodyTemplate[data.memberType],
      level: 'info',
      icon: 'coins',
      linkTo: data.memberType === 'pledger' ? '/payments' : '/contributions?modal=IncomeDetails',
      scope: 'group',
      data: {
        // is used to check if a notification has already been sent for a particular dist-period
        period: distPeriod
      }
    }
  },
  NEAR_DISTRIBUTION_END (data: { period: string }) {
    return {
      body: L("Less than 1 week left before the distribution period ends - don't forget to send payments!"),
      level: 'info',
      icon: 'coins',
      linkTo: '/payments',
      scope: 'group',
      data
    }
  }
}: { [key: string]: ((data: Object) => NotificationTemplate) })
