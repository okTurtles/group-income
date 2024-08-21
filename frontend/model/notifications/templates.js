import { GIMessage } from '~/shared/domains/chelonia/GIMessage.js'
import type {
  NewProposalType,
  NotificationTemplate
} from './types.flow.js'

import sbp from '@sbp/sbp'
import { L, LTags } from '@common/common.js'
import { humanDate } from '@model/contracts/shared/time.js'
import {
  STATUS_PASSED, STATUS_FAILED, STATUS_CANCELLED, STATUS_EXPIRED,
  PROPOSAL_INVITE_MEMBER, PROPOSAL_REMOVE_MEMBER, CHATROOM_MEMBER_MENTION_SPECIAL_CHAR,
  PROPOSAL_GROUP_SETTING_CHANGE, PROPOSAL_PROPOSAL_SETTING_CHANGE, PROPOSAL_GENERIC
} from '@model/contracts/shared/constants.js'
import { getProposalDetails } from '@model/contracts/shared/functions.js'

export default ({
  CHELONIA_ERROR (data: { activity: string, error: Error, message: GIMessage }) {
    const { activity, error, message } = data
    const contractID = message.contractID()
    const opType = message.opType()
    const value = message.decryptedValue()
    let action
    if ([GIMessage.OP_ACTION_ENCRYPTED, GIMessage.OP_ACTION_UNENCRYPTED].includes(opType) && value) {
      action = value.action
    }

    return {
      body: L("{errName} during {activity} for '{action}' to '{contract}': '{errMsg}'", {
        ...LTags('b'),
        errName: error.name,
        activity,
        action: action ?? opType,
        contract: sbp('state/vuex/state').contracts[contractID]?.type ?? contractID,
        errMsg: error.message ?? '?'
      }),
      icon: 'exclamation-triangle',
      level: 'danger',
      linkTo: `/app/dashboard?modal=UserSettingsModal&tab=application-logs&errorMsg=${encodeURIComponent(error.message)}`,
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
      linkTo: `/app/dashboard?modal=UserSettingsModal&tab=application-logs&errorMsg=${encodeURIComponent(data.message)}`,
      scope: 'app'
    }
  },
  CONTRIBUTION_REMINDER (data: { date: string }) {
    return {
      body: L('Do not forget to send your pledge by {strong_}{date}{_strong}.', {
        ...LTags('strong')
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
        months: Math.floor(data.months) // Avoid displaying decimals
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
    return {
      avatarUserID: data.memberID,
      body: L('The group has a new member. Say hi to {strong_}{name}{_strong}!', {
        name: `${CHATROOM_MEMBER_MENTION_SPECIAL_CHAR}${data.memberID}`,
        ...LTags('strong')
      }),
      icon: 'user-plus',
      level: 'info',
      linkTo: `/group-chat/${rootState[data.groupID]?.generalChatRoomId}`,
      scope: 'group'
    }
  },
  MEMBER_LEFT (data: { groupID: string, memberID: string }) {
    return {
      avatarUserID: data.memberID,
      body: L('{strong_}{name}{_strong} has left your group. Contributions were updated accordingly.', {
        name: `${CHATROOM_MEMBER_MENTION_SPECIAL_CHAR}${data.memberID}`,
        ...LTags('strong')
      }),
      icon: 'user-minus',
      level: 'danger',
      linkTo: '/contributions',
      scope: 'group'
    }
  },
  MEMBER_REMOVED (data: { groupID: string, memberID: string }) {
    return {
      avatarUserID: data.memberID,
      // REVIEW @mmbotelho - Not only contributions, but also proposals.
      body: L('{strong_}{name}{_strong} was kicked out of the group. Contributions were updated accordingly.', {
        name: `${CHATROOM_MEMBER_MENTION_SPECIAL_CHAR}${data.memberID}`,
        ...LTags('strong')
      }),
      icon: 'user-minus',
      level: 'danger',
      linkTo: '/contributions',
      scope: 'group'
    }
  },
  NEW_PROPOSAL (data: { groupID: string, creatorID: string, subtype: NewProposalType }) {
    const args = {
      name: `${CHATROOM_MEMBER_MENTION_SPECIAL_CHAR}${data.creatorID}`,
      ...LTags('strong')
    }
    const bodyTemplateMap = {
      ADD_MEMBER: L('{strong_}{name}{_strong} proposed to add a member to the group. Vote now!', args),
      CHANGE_MINCOME: L('{strong_}{name}{_strong} proposed to change the group mincome. Vote now!', args),
      CHANGE_DISTRIBUTION_DATE: L('{strong_}{name}{_strong} proposed to change the group distribution date. Vote now!', args),
      CHANGE_VOTING_RULE: L('{strong_}{name}{_strong} proposed to change the group voting system. Vote now!', args),
      REMOVE_MEMBER: L('{strong_}{name}{_strong} proposed to remove a member from the group. Vote now!', args),
      GENERIC: L('{strong_}{name}{_strong} created a proposal. Vote now!', args)
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
      body: bodyTemplateMap[data.subtype],
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

    const statusMap = {
      [STATUS_PASSED]: { icon: 'check', level: 'success', closedWith: L('accepted') },
      [STATUS_FAILED]: { icon: 'times', level: 'danger', closedWith: L('rejected') },
      [STATUS_CANCELLED]: { icon: 'times', level: 'danger', closedWith: L('cancelled') }, // TODO: define icon, level
      [STATUS_EXPIRED]: { icon: 'times', level: 'danger', closedWith: L('expired') } // TODO: define icon, level
    }
    const args = {
      ...options,
      ...LTags('strong'),
      closedWith: statusMap[status].closedWith,
      name: `${CHATROOM_MEMBER_MENTION_SPECIAL_CHAR}${creatorID}`
    }

    if (options.memberID) {
      // NOTE: replace member with their mention when their contractID is provided
      //       e.g., when the type is  PROPOSAL_REMOVE_MEMBER
      args['member'] = `${CHATROOM_MEMBER_MENTION_SPECIAL_CHAR}${options.memberID}`
    }

    const bodyTemplateMap = {
      [PROPOSAL_INVITE_MEMBER]:
        L("{strong_}{name}'s{_strong} proposal to add {member} to the group was {strong_}{closedWith}{_strong}.", args),
      [PROPOSAL_REMOVE_MEMBER]:
        L("{strong_}{name}'s{_strong} proposal to remove {member} from the group was {strong_}{closedWith}{_strong}.", args),
      [PROPOSAL_GROUP_SETTING_CHANGE]:
        L("{strong_}{name}'s{_strong} proposal to change group's {setting} to {value} was {strong_}{closedWith}{_strong}.", args),
      [PROPOSAL_PROPOSAL_SETTING_CHANGE]:
        L("{strong_}{name}'s{_strong} proposal to change group's {setting} was {strong_}{closedWith}{_strong}.", args),
      [PROPOSAL_GENERIC]:
        L('{strong_}{name}\'s{_strong} proposal "{title}" was {strong_}{closedWith}{_strong}.', args)
    }

    return {
      avatarUserID: creatorID,
      body: bodyTemplateMap[type],
      icon: statusMap[status].icon,
      level: statusMap[status].level,
      linkTo: '/dashboard#proposals',
      scope: 'group'
    }
  },
  PAYMENT_RECEIVED (data: { creatorID: string, amount: string, paymentHash: string }) {
    return {
      avatarUserID: data.creatorID,
      body: L('{strong_}{name}{_strong} sent you a {amount} mincome contribution. {strong_}Review and send a thank you note.{_strong}', {
        name: `${CHATROOM_MEMBER_MENTION_SPECIAL_CHAR}${data.creatorID}`,
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
      avatarUserID: data.fromMemberID,
      body: L('{strong_}{name}{_strong} sent you a {strong_}thank you note{_strong} for your contribution.', {
        name: `${CHATROOM_MEMBER_MENTION_SPECIAL_CHAR}${data.fromMemberID}`,
        ...LTags('strong')
      }),
      creatorID: data.fromMemberID,
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
  NEW_DISTRIBUTION_PERIOD (data: { period: string, creatorID: string, memberType: string }) {
    const { period, creatorID, memberType } = data
    const periodDisplay = humanDate(period, { month: 'short', day: 'numeric', year: 'numeric' })
    const bodyTemplate = {
      // Display the distribution period in the notification message (issue: https://github.com/okTurtles/group-income/issues/1903)
      'pledger': L('A new distribution period ({period}) has started. Please check Payment TODOs.', { period: periodDisplay }),
      'receiver': L('A new distribution period ({period}) has started. Please update your income details if they have changed.', { period: periodDisplay })
    }

    return {
      avatarUserID: creatorID,
      body: bodyTemplate[memberType],
      level: 'info',
      icon: 'coins',
      linkTo: memberType === 'pledger' ? '/payments' : '/contributions?modal=IncomeDetails',
      scope: 'group',
      data: { period } // is used to check if a notification has already been sent for a particular dist-period
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
  },
  NONMONETARY_CONTRIBUTION_UPDATE (
    data: {
      creatorID: string,
      updateData: { prev: any[], after: any[] }
    }
  ) {
    const { prev, after } = data.updateData
    const added = after.filter(v => !prev.includes(v))
    const removed = prev.filter(v => !after.includes(v))
    const updateType = added.length
      ? removed.length
        ? 'updated'
        : 'added'
      : removed.length
        ? 'removed'
        : null

    if (!updateType) {
      throw new Error('Cannot emit a NONMONETARY_CONTRIBUTION_UPDATE notification for no updates.')
    }

    const name = `${CHATROOM_MEMBER_MENTION_SPECIAL_CHAR}${data.creatorID}`
    const contributionsFormatted = (entries) => {
      const first = entries[0]
      const len = entries.length
      return entries.length > 1
        ? L('{first} and {rest} more', { first, rest: len - 1 })
        : first
    }
    const bodyContentMap = { // !@#
      added: () => L('{name} added non-monetary contribution: {strong_}{added}{_strong}', { name, added: contributionsFormatted(added), ...LTags('strong') }),
      removed: () => L('{name} removed non-monetary contribution: {strong_}{removed}{_strong}', { name, removed: contributionsFormatted(removed), ...LTags('strong') }),
      updated: () => L('{name} updated non-monetary contribution: added {strong_}{added}{_strong} and removed {strong_}{removed}{_strong}', {
        name,
        added: contributionsFormatted(added),
        removed: contributionsFormatted(removed),
        ...LTags('strong')
      })
    }
    return {
      body: bodyContentMap[updateType](),
      scope: 'group',
      avatarUserID: data.creatorID,
      level: 'info',
      icon: 'coins', // TODO: change it to something else
      linkTo: '/contributions',
      data: data.updateData // TODO: Remove if not needed
    }
  }
}: { [key: string]: ((data: Object) => NotificationTemplate) })
