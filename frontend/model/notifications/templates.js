import type { GIMessage } from '~/shared/domains/chelonia/chelonia.js'
import type {
  NewProposalType,
  NotificationTemplate
} from './types.flow.js'

import sbp from '@sbp/sbp'
import { L, LTags } from '@common/common.js'
import {
  STATUS_PASSED, STATUS_FAILED, PROPOSAL_INVITE_MEMBER, PROPOSAL_REMOVE_MEMBER,
  PROPOSAL_GROUP_SETTING_CHANGE, PROPOSAL_PROPOSAL_SETTING_CHANGE, PROPOSAL_GENERIC
} from '@model/contracts/shared/constants.js'

const contractName = (contractID) => sbp('state/vuex/state').contracts[contractID]?.type ?? contractID
// Note: this escaping is not intended as a protection against XSS.
// It is only done to enable correct rendering of special characters in usernames.
// To guard against XSS when rendering usernames, use the `v-safe-html` directive.
const escapeForHtml = (text) => text.replace(/[<>&]/g, (c) => ('&#' + c.codePointAt(0) + ';'))
const strong = (text) => `<strong>${escapeForHtml(text)}</strong>`

export default ({
  CHELONIA_ERROR (data: { activity: string, error: Error, message: GIMessage }) {
    const { activity, error, message } = data
    const contractID = message.contractID()
    const [opType] = message.op()
    const { action, meta } = message.decryptedValue()
    return {
      body: L("{errName} during {activity} for '{action}' from {b_}{who}{_b} to '{contract}': '{errMsg}'", {
        ...LTags('b'),
        errName: error.name,
        activity,
        action: action ?? opType,
        who: meta?.username ?? 'TODO: signing keyID',
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
  MEMBER_ADDED (data: { groupID: string, username: string }) {
    const rootState = sbp('state/vuex/state')

    return {
      avatarUsername: data.username,
      body: L('The group has a new member. Say hi to {name}!', {
        name: strong(data.username)
      }),
      icon: 'user-plus',
      level: 'info',
      linkTo: `/group-chat/${rootState[data.groupID]?.generalChatRoomId}`,
      scope: 'group'
    }
  },
  MEMBER_LEFT (data: { groupID: string, username: string }) {
    return {
      avatarUsername: data.username,
      body: L('{name} has left your group. Contributions were updated accordingly.', {
        name: strong(data.username)
      }),
      icon: 'user-minus',
      level: 'danger',
      linkTo: '/contributions',
      scope: 'group'
    }
  },
  MEMBER_REMOVED (data: { groupID: string, username: string }) {
    return {
      avatarUsername: data.username,
      // REVIEW @mmbotelho - Not only contributions, but also proposals.
      body: L('{name} was kicked out of the group. Contributions were updated accordingly.', {
        name: strong(data.username)
      }),
      icon: 'user-minus',
      level: 'danger',
      linkTo: '/contributions',
      scope: 'group'
    }
  },
  NEW_PROPOSAL (data: { groupID: string, creator: string, subtype: NewProposalType }) {
    const bodyTemplateMap = {
      ADD_MEMBER: (creator: string) => L('{member} proposed to add a member to the group. Vote now!', { member: strong(creator) }),
      CHANGE_MINCOME: (creator: string) => L('{member} proposed to change the group mincome. Vote now!', { member: strong(creator) }),
      CHANGE_VOTING_RULE: (creator: string) => L('{member} proposed to change the group voting system. Vote now!', { member: strong(creator) }),
      REMOVE_MEMBER: (creator: string) => L('{member} proposed to remove a member from the group. Vote now!', { member: strong(creator) }),
      GENERIC: (creator: string) => L('{member} created a proposal. Vote now!', { member: strong(creator) })
    }

    const iconMap = {
      ADD_MEMBER: 'user-plus',
      CHANGE_MINCOME: 'coins',
      CHANGE_VOTING_RULE: 'vote-yea',
      REMOVE_MEMBER: 'user-minus',
      GENERIC: 'envelope-open-text'
    }

    return {
      avatarUsername: data.creator,
      body: bodyTemplateMap[data.subtype](data.creator),
      creator: data.creator,
      icon: iconMap[data.subtype],
      level: 'info',
      linkTo: '/dashboard#proposals',
      subtype: data.subtype,
      scope: 'group'
    }
  },
  PROPOSAL_EXPIRING (data: { creator: string, proposalType: string, title?: string, proposalId: string }) {
    const typeToTitleMap = {
      [PROPOSAL_INVITE_MEMBER]: L('Member addition'),
      [PROPOSAL_REMOVE_MEMBER]: L('Member removal'),
      [PROPOSAL_GROUP_SETTING_CHANGE]: L('Mincome change'),
      [PROPOSAL_PROPOSAL_SETTING_CHANGE]: L('Voting rule change'),
      [PROPOSAL_GENERIC]: data.title
    }

    return {
      avatarUsername: data.creator,
      body: L('Proposal about to expire: {i_}"{proposalTitle}"{_i}. please vote!', {
        ...LTags('i'),
        proposalTitle: typeToTitleMap[data.proposalType]
      }),
      level: 'info',
      icon: 'exclamation-triangle',
      scope: 'group',
      linkTo: '/dashboard#proposals',
      data: { proposalId: data.proposalId }
    }
  },
  PROPOSAL_CLOSED (data: { groupID: string, creator: string, proposalStatus: string }) {
    const bodyTemplateMap = {
      // TODO: needs various messages depending on the proposal type? TBD by team.
      [STATUS_PASSED]: (creator: string) => L("{member}'s proposal has passed.", { member: strong(creator) }),
      [STATUS_FAILED]: (creator: string) => L("{member}'s proposal has failed.", { member: strong(creator) })
    }

    return {
      avatarUsername: data.creator,
      body: bodyTemplateMap[data.proposalStatus](data.creator),
      icon: 'cog', // TODO : to be decided.
      level: 'info',
      linkTo: '/dashboard#proposals',
      scope: 'group'
    }
  },
  PAYMENT_RECEIVED (data: { creator: string, amount: string, paymentHash: string }) {
    const { userDisplayName } = sbp('state/vuex/getters')

    return {
      avatarUsername: data.creator,
      body: L('{fromUser} sent you a {amount} mincome contribution. {strong_}Review and send a thank you note.{_strong}', {
        fromUser: userDisplayName(data.creator), // displayName of the sender
        amount: data.amount,
        ...LTags('strong')
      }),
      creator: data.creator,
      icon: '',
      level: 'info',
      linkTo: `/payments?modal=PaymentDetail&id=${data.paymentHash}`,
      scope: 'group'
    }
  },
  PAYMENT_THANKYOU_SENT (data: { creator: string, fromUser: string, toUser: string }) {
    return {
      avatarUsername: data.creator,
      body: L('{name} sent you a {strong_}thank you note{_strong} for your contribution.', {
        name: strong(data.fromUser),
        ...LTags('strong')
      }),
      creator: data.creator,
      icon: '',
      level: 'info',
      linkTo: `/payments?modal=ThankYouNoteModal&from=${data.fromUser}&to=${data.toUser}`,
      scope: 'group'
    }
  },
  MINCOME_CHANGED (data: { creator: string, to: number, memberType: string, increased: boolean }) {
    const { withGroupCurrency } = sbp('state/vuex/getters')
    return {
      avatarUsername: data.creator,
      body: L('The mincome has changed to {amount}.', { amount: withGroupCurrency(data.to) }),
      creator: data.creator,
      icon: '',
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
  NEW_DISTRIBUTION_PERIOD (data: { creator: string, memberType: string }) {
    const bodyTemplate = {
      'pledger': L('A new distribution period has started. Please check Payment TODOs.'),
      'receiver': L('A new distribution period has started. Please update your income details if they have changed.')
    }

    return {
      avatarUsername: data.creator,
      body: bodyTemplate[data.memberType],
      level: 'info',
      icon: 'coins',
      linkTo: data.memberType === 'pledger' ? '/payments' : '/contributions?modal=IncomeDetails',
      scope: 'group',
      data: {
        // is used to check if a notification has already been sent for a particular dist-period
        period: sbp('state/vuex/getters').groupSettings?.distributionDate
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
