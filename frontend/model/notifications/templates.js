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
      body: {
        key: "{errName} during {activity} for '{action}' from {b_}{who}{_b} to '{contract}': '{errMsg}'",
        args: {
          ...LTags('b'),
          errName: error.name,
          activity,
          action: action ?? opType,
          who: `${CHATROOM_MEMBER_MENTION_SPECIAL_CHAR}${message.signingKeyId()}`,
          contract: sbp('state/vuex/state').contracts[contractID]?.type ?? contractID,
          errMsg: error.message ?? '?'
        }
      },
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
      body: {
        key: 'Do not forget to send your pledge by {strong_}{date}{_strong}.',
        args: { ...LTags('strong') }
      },
      icon: 'coins',
      level: 'info',
      linkTo: '/payments',
      scope: 'user'
    }
  },
  INCOME_DETAILS_OLD (data: { months: number, lastUpdatedDate: string }) {
    return {
      body: {
        key: "You haven't updated your income details in more than {months} months. Would you like to review them now?",
        args: { months: Math.floor(data.months) } // Avoid displaying decimals
      },
      icon: 'coins',
      level: 'info',
      linkTo: '/contributions?modal=IncomeDetails',
      scope: 'user',
      data: { lastUpdatedDate: data.lastUpdatedDate }
    }
  },
  MEMBER_ADDED (data: { groupID: string, memberID: string }) {
    return {
      avatarUserID: data.memberID,
      body: {
        key: 'The group has a new member. Say hi to {strong_}{name}{_strong}!',
        args: {
          name: `${CHATROOM_MEMBER_MENTION_SPECIAL_CHAR}${data.memberID}`,
          ...LTags('strong')
        }
      },
      icon: 'user-plus',
      level: 'info',
      linkTo: `/group-chat/${sbp('state/vuex/state')[data.groupID]?.generalChatRoomId}`,
      scope: 'group'
    }
  },
  MEMBER_LEFT (data: { groupID: string, memberID: string }) {
    return {
      avatarUserID: data.memberID,
      body: {
        key: '{strong_}{name}{_strong} has left your group. Contributions were updated accordingly.',
        args: {
          name: `${CHATROOM_MEMBER_MENTION_SPECIAL_CHAR}${data.memberID}`,
          ...LTags('strong')
        }
      },
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
      body: {
        key: '{strong_}{name}{_strong} was kicked out of the group. Contributions were updated accordingly.',
        args: {
          name: `${CHATROOM_MEMBER_MENTION_SPECIAL_CHAR}${data.memberID}`,
          ...LTags('strong')
        }
      },
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
      ADD_MEMBER: () => ({ key: '{strong_}{name}{_strong} proposed to add a member to the group. Vote now!', args }),
      CHANGE_MINCOME: () => ({ key: '{strong_}{name}{_strong} proposed to change the group mincome. Vote now!', args }),
      CHANGE_DISTRIBUTION_DATE: () => ({ key: '{strong_}{name}{_strong} proposed to change the group distribution date. Vote now!', args }),
      CHANGE_VOTING_RULE: () => ({ key: '{strong_}{name}{_strong} proposed to change the group voting system. Vote now!', args }),
      REMOVE_MEMBER: () => ({ key: '{strong_}{name}{_strong} proposed to remove a member from the group. Vote now!', args }),
      GENERIC: () => ({ key: '{strong_}{name}{_strong} created a proposal. Vote now!', args })
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
      body: {
        key: 'Proposal about to expire: {i_}"{proposalTitle}"{_i}. Please vote!',
        args: { ...LTags('i'), proposalTitle: typeToTitleMap[proposalType] }
      },
      level: 'info',
      icon: 'exclamation-triangle',
      scope: 'group',
      linkTo: '/dashboard#proposals',
      data: { proposalId: data.proposalId }
    }
  },
  PROPOSAL_CLOSED (data: { proposal: Object }) {
    const { creatorID, status, type, options } = getProposalDetails(data.proposal)
    const isMe = sbp('state/vuex/getters').ourIdentityContractId === creatorID

    const statusMap = {
      [STATUS_PASSED]: { icon: 'check', level: 'success', closedWith: L('accepted') },
      [STATUS_FAILED]: { icon: 'times', level: 'danger', closedWith: L('rejected') },
      [STATUS_CANCELLED]: { icon: 'times', level: 'danger', closedWith: L('cancelled') }, // TODO: define icon, level
      [STATUS_EXPIRED]: { icon: 'times', level: 'danger', closedWith: L('expired') } // TODO: define icon, level
    }
    const args = { ...options, closedWith: statusMap[status].closedWith }

    const makeBodyBasedOnCreator = (key) => {
      return isMe
        ? { key: '{strong_}Your{_strong} ' + key, args }
        : {
            key: "{strong_}{name}'s{_strong} " + key,
            args: { ...args, name: `${CHATROOM_MEMBER_MENTION_SPECIAL_CHAR}${creatorID}` }
          }
    }
    const bodyTemplateMap = {
      [PROPOSAL_INVITE_MEMBER]:
        () => makeBodyBasedOnCreator('proposal to add {member} to the group was {strong_}{closedWith}{_strong}.'),
      [PROPOSAL_REMOVE_MEMBER]:
        () => makeBodyBasedOnCreator('proposal to remove {member} from the group was {strong_}{closedWith}{_strong}.'),
      [PROPOSAL_GROUP_SETTING_CHANGE]:
        () => makeBodyBasedOnCreator("proposal to change group's {setting} to {value} was {strong_}{closedWith}{_strong}."),
      [PROPOSAL_PROPOSAL_SETTING_CHANGE]:
        () => makeBodyBasedOnCreator("proposal to change group's {setting} was {strong_}{closedWith}{_strong}."),
      [PROPOSAL_GENERIC]:
        () => makeBodyBasedOnCreator('proposal "{title}" was {strong_}{closedWith}{_strong}.')
    }

    return {
      avatarUserID: creatorID,
      body: bodyTemplateMap[type](),
      icon: statusMap[status].icon,
      level: statusMap[status].level,
      linkTo: '/dashboard#proposals',
      scope: 'group'
    }
  },
  PAYMENT_RECEIVED (data: { creatorID: string, amount: string, paymentHash: string }) {
    return {
      avatarUserID: data.creatorID,
      body: {
        key: '{strong_}{name}{_strong} sent you a {amount} mincome contribution. {strong_}Review and send a thank you note.{_strong}',
        args: {
          name: `${CHATROOM_MEMBER_MENTION_SPECIAL_CHAR}${data.creatorID}`,
          amount: data.amount,
          ...LTags('strong')
        }
      },
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
      body: {
        key: '{strong_}{name}{_strong} sent you a {strong_}thank you note{_strong} for your contribution.',
        args: {
          name: `${CHATROOM_MEMBER_MENTION_SPECIAL_CHAR}${data.fromMemberID}`,
          ...LTags('strong')
        }
      },
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
      body: {
        key: 'The mincome has changed to {amount}.',
        args: { amount: withGroupCurrency(data.to) }
      },
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
    const args = { period: humanDate(distPeriod, { month: 'short', day: 'numeric', year: 'numeric' }) }
    const bodyTemplate = {
      // Display the distribution period in the notification message (issue: https://github.com/okTurtles/group-income/issues/1903)
      'pledger': () => ({
        key: 'A new distribution period ({period}) has started. Please check Payment TODOs.',
        args
      }),
      'receiver': () => ({
        key: 'A new distribution period ({period}) has started. Please update your income details if they have changed.',
        args
      })
    }

    return {
      avatarUserID: data.creatorID,
      body: bodyTemplate[data.memberType](),
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
      body: {
        key: "Less than 1 week left before the distribution period ends - don't forget to send payments!"
      },
      level: 'info',
      icon: 'coins',
      linkTo: '/payments',
      scope: 'group',
      data
    }
  }
}: { [key: string]: ((data: Object) => NotificationTemplate) })
