import { SPMessage } from '@chelonia/lib/SPMessage'
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
import { findContractIDByForeignKeyId } from '@chelonia/lib/utils'

export default ({
  CHELONIA_ERROR (data: { activity: string, error: Error, message: SPMessage, msgMeta?: Object }) {
    const { activity, error, message, msgMeta } = data
    const contractID = message.contractID()
    const opType = message.opType()
    const value = message.decryptedValue()
    let action
    if (value) {
      if ([SPMessage.OP_ACTION_ENCRYPTED, SPMessage.OP_ACTION_UNENCRYPTED].includes(opType)) {
        action = value.action
      } else if (msgMeta && opType === SPMessage.OP_ATOMIC && Number.isFinite(msgMeta.index) && [SPMessage.OP_ACTION_ENCRYPTED, SPMessage.OP_ACTION_UNENCRYPTED].includes(value[msgMeta.index][0])) {
        action = value[msgMeta.index][1].action
      }
    }
    const state = sbp('state/vuex/state')
    let who, plaintextWho

    if (message.innerSigningKeyId()) {
      const innerSigningContractID = findContractIDByForeignKeyId(state[message.contractID()], message.innerSigningKeyId())
      if (innerSigningContractID) {
        who = `${CHATROOM_MEMBER_MENTION_SPECIAL_CHAR}${innerSigningContractID}`
        plaintextWho = sbp('state/vuex/getters').userDisplayNameFromID(innerSigningContractID)
      }
    }

    const LcommonParams = {
      errName: error.name,
      activity,
      action: action ?? opType,
      contract: state.contracts[contractID]?.type ?? contractID,
      errMsg: error.message
    }

    const Lparams = {
      ...LcommonParams,
      ...LTags('b'),
      who
    }

    const LplaintextParams = {
      ...LcommonParams,
      who: plaintextWho
    }

    return {
      title: L('Internal error'),
      body: who
        ? L("{errName} during {activity} for '{action}' from {b_}{who}{_b} to '{contract}': '{errMsg}'", Lparams)
        : L("{errName} during {activity} for '{action}' to '{contract}': '{errMsg}'", Lparams),
      plaintextBody: who
        ? L("{errName} during {activity} for '{action}' from {who} to '{contract}': '{errMsg}'", LplaintextParams)
        : L("{errName} during {activity} for '{action}' to '{contract}': '{errMsg}'", LplaintextParams),
      icon: 'exclamation-triangle',
      level: 'danger',
      linkTo: `/app/dashboard?modal=UserSettingsModal&tab=application-logs&errorMsg=${encodeURIComponent(error.message)}`,
      scope: 'app'
    }
  },
  GENERAL (data: { contractID: string, message: string }) {
    return {
      title: L('Group Income'),
      body: data.message,
      plaintextBody: data.message,
      icon: 'cog',
      level: 'info',
      linkTo: '',
      scope: 'app'
    }
  },
  WARNING (data: { contractID: string, message: string }) {
    return {
      title: L('Warning'),
      body: data.message,
      plaintextBody: data.message,
      icon: 'exclamation-triangle',
      level: 'danger',
      linkTo: '',
      scope: 'app'
    }
  },
  ERROR (data: { contractID: string, message: string }) {
    return {
      title: L('Error'),
      body: data.message,
      plaintextBody: data.message,
      icon: 'exclamation-triangle',
      level: 'danger',
      linkTo: `/app/dashboard?modal=UserSettingsModal&tab=application-logs&errorMsg=${encodeURIComponent(data.message)}`,
      scope: 'app'
    }
  },
  CONTRIBUTION_REMINDER (data: { date: string }) {
    return {
      title: L('Contribution reminder'),
      body: L('Do not forget to send your pledge by {strong_}{date}{_strong}.', {
        date: data.date,
        ...LTags('strong')
      }),
      plaintextBody: L('Do not forget to send your pledge by {strong_}{date}{_strong}.', {
        date: data.date
      }),
      icon: 'coins',
      level: 'info',
      linkTo: '/payments',
      scope: 'user'
    }
  },
  INCOME_DETAILS_OLD (data: { months: number, lastUpdatedDate: string }) {
    return {
      title: L('Update income details'),
      body: L("You haven't updated your income details in more than {months} months. Would you like to review them now?", {
        months: Math.floor(data.months) // Avoid displaying decimals
      }),
      plaintextBody: L("You haven't updated your income details in more than {months} months. Would you like to review them now?", {
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
    const plaintextName = sbp('state/vuex/getters').userDisplayNameFromID(data.memberID)
    // Used to avoid displaying a contract ID when no name is available, see
    // <https://github.com/okTurtles/group-income/issues/2834>
    const hasPlaintextName = plaintextName !== data.memberID
    return {
      avatarUserID: data.memberID,
      title: rootState[data.groupID]?.settings?.groupName || L('Member added'),
      body: L('The group has a new member. Say hi to {strong_}{name}{_strong}!', {
        name: `${CHATROOM_MEMBER_MENTION_SPECIAL_CHAR}${data.memberID}`,
        ...LTags('strong')
      }),
      plaintextBody: hasPlaintextName
        ? L('The group has a new member. Say hi to {strong_}{name}{_strong}!', {
          name: plaintextName
        })
        : L('The group has a new member. Say hi!'),
      icon: 'user-plus',
      level: 'info',
      linkTo: `/group-chat/${rootState[data.groupID]?.generalChatRoomId}`,
      scope: 'group',
      groupID: data.groupID
    }
  },
  MEMBER_LEFT (data: { groupID: string, memberID: string }) {
    const rootState = sbp('state/vuex/state')
    const plaintextName = sbp('state/vuex/getters').userDisplayNameFromID(data.memberID)
    // Used to avoid displaying a contract ID when no name is available, see
    // <https://github.com/okTurtles/group-income/issues/2834>
    const hasPlaintextName = plaintextName !== data.memberID
    return {
      title: rootState[data.groupID]?.settings?.groupName || L('Member added'),
      avatarUserID: data.memberID,
      body: L('{strong_}{name}{_strong} has left your group. Contributions were updated accordingly.', {
        name: `${CHATROOM_MEMBER_MENTION_SPECIAL_CHAR}${data.memberID}`,
        ...LTags('strong')
      }),
      plaintextBody: hasPlaintextName
        ? L('{strong_}{name}{_strong} has left your group. Contributions were updated accordingly.', {
          name: plaintextName
        })
        : L('A member left your group. Contributions were updated accordingly.', {
          name: plaintextName
        }),
      icon: 'user-minus',
      level: 'danger',
      linkTo: '/contributions',
      scope: 'group',
      groupID: data.groupID
    }
  },
  MEMBER_REMOVED (data: { groupID: string, memberID: string }) {
    const rootState = sbp('state/vuex/state')
    const plaintextName = sbp('state/vuex/getters').userDisplayNameFromID(data.memberID)
    const hasPlaintextName = plaintextName !== data.memberID
    // Used to avoid displaying a contract ID when no name is available, see
    // <https://github.com/okTurtles/group-income/issues/2834>
    return {
      title: rootState[data.groupID]?.settings?.groupName || L('Member added'),
      avatarUserID: data.memberID,
      // REVIEW @mmbotelho - Not only contributions, but also proposals.
      body: L('{strong_}{name}{_strong} was kicked out of the group. Contributions were updated accordingly.', {
        name: `${CHATROOM_MEMBER_MENTION_SPECIAL_CHAR}${data.memberID}`,
        ...LTags('strong')
      }),
      plaintextBody: hasPlaintextName
        ? L('{strong_}{name}{_strong} was kicked out of the group. Contributions were updated accordingly.', {
          name: plaintextName
        })
        : L('A member was kicked out of the group. Contributions were updated accordingly.'),
      icon: 'user-minus',
      level: 'danger',
      linkTo: '/contributions',
      scope: 'group',
      groupID: data.groupID
    }
  },
  NEW_PROPOSAL (data: { groupID: string, creatorID: string, proposalHash: string, subtype: NewProposalType }) {
    const rootState = sbp('state/vuex/state')
    const isCreator = data.creatorID === sbp('state/vuex/getters').ourIdentityContractId // notification message is different for creator and non-creator.
    const args = {
      name: `${CHATROOM_MEMBER_MENTION_SPECIAL_CHAR}${data.creatorID}`,
      ...LTags('strong')
    }
    const plaintextArgs = {
      name: sbp('state/vuex/getters').userDisplayNameFromID(data.creatorID)
    }

    const bodyTemplateMap = {
      ADD_MEMBER: isCreator
        ? L('You proposed to add a member to the group.')
        : L('{strong_}{name}{_strong} proposed to add a member to the group. Vote now!', args),
      CHANGE_MINCOME: isCreator
        ? L('You proposed to change the group mincome.')
        : L('{strong_}{name}{_strong} proposed to change the group mincome. Vote now!', args),
      CHANGE_DISTRIBUTION_DATE: isCreator
        ? L('You proposed to change the group distribution date.')
        : L('{strong_}{name}{_strong} proposed to change the group distribution date. Vote now!', args),
      CHANGE_VOTING_RULE: isCreator
        ? L('You proposed to change the group voting system.')
        : L('{strong_}{name}{_strong} proposed to change the group voting system. Vote now!', args),
      REMOVE_MEMBER: isCreator
        ? L('You proposed to remove a member from the group.')
        : L('{strong_}{name}{_strong} proposed to remove a member from the group. Vote now!', args),
      GENERIC: isCreator
        ? L('You created a proposal.')
        : L('{strong_}{name}{_strong} created a proposal. Vote now!', args)
    }

    const plaintextBodyTemplateMap = {
      ADD_MEMBER: isCreator
        ? L('You proposed to add a member to the group.')
        : L('{strong_}{name}{_strong} proposed to add a member to the group. Vote now!', plaintextArgs),
      CHANGE_MINCOME: isCreator
        ? L('You proposed to change the group mincome.')
        : L('{strong_}{name}{_strong} proposed to change the group mincome. Vote now!', plaintextArgs),
      CHANGE_DISTRIBUTION_DATE: isCreator
        ? L('You proposed to change the group distribution date.')
        : L('{strong_}{name}{_strong} proposed to change the group distribution date. Vote now!', plaintextArgs),
      CHANGE_VOTING_RULE: isCreator
        ? L('You proposed to change the group voting system.')
        : L('{strong_}{name}{_strong} proposed to change the group voting system. Vote now!', plaintextArgs),
      REMOVE_MEMBER: isCreator
        ? L('You proposed to remove a member from the group.')
        : L('{strong_}{name}{_strong} proposed to remove a member from the group. Vote now!', plaintextArgs),
      GENERIC: isCreator
        ? L('You created a proposal.')
        : L('{strong_}{name}{_strong} created a proposal. Vote now!', plaintextArgs)
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
      title: rootState[data.groupID]?.settings?.groupName || L('New proposal'),
      avatarUserID: data.creatorID,
      body: bodyTemplateMap[data.subtype],
      plaintextBody: plaintextBodyTemplateMap[data.subtype],
      creatorID: data.creatorID,
      icon: iconMap[data.subtype],
      level: 'info',
      subtype: data.subtype,
      scope: 'group',
      sbpInvocation: ['gi.app/group/checkAndSeeProposal', {
        contractID: data.groupID,
        data: { proposalHash: data.proposalHash }
      }]
    }
  },
  PROPOSAL_EXPIRING (data: { groupID: string, proposalId: string, proposal: Object }) {
    const rootState = sbp('state/vuex/state')
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
      title: rootState[data.groupID]?.settings?.groupName || L('Proposal expiring'),
      avatarUserID: '',
      body: L('Proposal about to expire: {i_}"{proposalTitle}"{_i}. Please vote!', {
        ...LTags('i'),
        proposalTitle: typeToTitleMap[proposalType]
      }),
      plaintextBody: L('Proposal about to expire: {i_}"{proposalTitle}"{_i}. Please vote!', {
        proposalTitle: typeToTitleMap[proposalType]
      }),
      level: 'info',
      icon: 'exclamation-triangle',
      scope: 'group',
      data: { proposalId: data.proposalId },
      sbpInvocation: ['gi.app/group/checkAndSeeProposal', {
        contractID: data.groupID,
        data: { proposalHash: data.proposalId }
      }]
    }
  },
  PROPOSAL_CLOSED (data: { groupID: string, proposal: Object, proposalHash: string }) {
    const rootState = sbp('state/vuex/state')
    const { creatorID, status, type, options } = getProposalDetails(data.proposal)
    const isCreator = creatorID === sbp('state/vuex/getters').ourIdentityContractId // notification message is different for creator and non-creator

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
      name: !isCreator ? `${CHATROOM_MEMBER_MENTION_SPECIAL_CHAR}${creatorID}` : ''
    }

    const plaintextArgs = {
      ...options,
      closedWith: statusMap[status].closedWith,
      name: !isCreator ? sbp('state/vuex/getters').userDisplayNameFromID(creatorID) : ''
    }

    if (options.memberID) {
      // NOTE: replace member with their mention when their contractID is provided
      //       e.g., when the type is  PROPOSAL_REMOVE_MEMBER
      args['member'] = `${CHATROOM_MEMBER_MENTION_SPECIAL_CHAR}${options.memberID}`
      plaintextArgs['member'] = sbp('state/vuex/getters').userDisplayNameFromID(options.memberID)
    }

    const bodyTemplateMap = {
      [PROPOSAL_INVITE_MEMBER]: isCreator
        ? L('Your proposal to add {member} to the group was {strong_}{closedWith}{_strong}.', args)
        : L("{strong_}{name}'s{_strong} proposal to add {member} to the group was {strong_}{closedWith}{_strong}.", args),
      [PROPOSAL_REMOVE_MEMBER]: isCreator
        ? L('Your proposal to remove {member} from the group was {strong_}{closedWith}{_strong}.', args)
        : L("{strong_}{name}'s{_strong} proposal to remove {member} from the group was {strong_}{closedWith}{_strong}.", args),
      [PROPOSAL_GROUP_SETTING_CHANGE]: isCreator
        ? L('Your proposal to change group\'s {setting} to {value} was {strong_}{closedWith}{_strong}.', args)
        : L("{strong_}{name}'s{_strong} proposal to change group's {setting} to {value} was {strong_}{closedWith}{_strong}.", args),
      [PROPOSAL_PROPOSAL_SETTING_CHANGE]: isCreator
        ? L('Your proposal to change group\'s {setting} was {strong_}{closedWith}{_strong}.', args)
        : L("{strong_}{name}'s{_strong} proposal to change group's {setting} was {strong_}{closedWith}{_strong}.", args),
      [PROPOSAL_GENERIC]: isCreator
        ? L('Your proposal "{title}" was {strong_}{closedWith}{_strong}.', args)
        : L("{strong_}{name}'s{_strong} proposal \"{title}\" was {strong_}{closedWith}{_strong}.", args)
    }

    const plaintextBodyTemplateMap = {
      [PROPOSAL_INVITE_MEMBER]: isCreator
        ? L('Your proposal to add {member} to the group was {strong_}{closedWith}{_strong}.', plaintextArgs)
        : L("{strong_}{name}'s{_strong} proposal to add {member} to the group was {strong_}{closedWith}{_strong}.", plaintextArgs),
      [PROPOSAL_REMOVE_MEMBER]: isCreator
        ? L('Your proposal to remove {member} from the group was {strong_}{closedWith}{_strong}.', plaintextArgs)
        : L("{strong_}{name}'s{_strong} proposal to remove {member} from the group was {strong_}{closedWith}{_strong}.", plaintextArgs),
      [PROPOSAL_GROUP_SETTING_CHANGE]: isCreator
        ? L('Your proposal to change group\'s {setting} to {value} was {strong_}{closedWith}{_strong}.', plaintextArgs)
        : L("{strong_}{name}'s{_strong} proposal to change group's {setting} to {value} was {strong_}{closedWith}{_strong}.", plaintextArgs),
      [PROPOSAL_PROPOSAL_SETTING_CHANGE]: isCreator
        ? L('Your proposal to change group\'s {setting} was {strong_}{closedWith}{_strong}.', plaintextArgs)
        : L("{strong_}{name}'s{_strong} proposal to change group's {setting} was {strong_}{closedWith}{_strong}.", plaintextArgs),
      [PROPOSAL_GENERIC]: isCreator
        ? L('Your proposal "{title}" was {strong_}{closedWith}{_strong}.', plaintextArgs)
        : L("{strong_}{name}'s{_strong} proposal \"{title}\" was {strong_}{closedWith}{_strong}.", plaintextArgs)
    }

    return {
      title: rootState[data.groupID]?.settings?.groupName || L('Proposal closed'),
      avatarUserID: creatorID,
      body: bodyTemplateMap[type],
      plaintextBody: plaintextBodyTemplateMap[type],
      icon: statusMap[status].icon,
      level: statusMap[status].level,
      scope: 'group',
      sbpInvocation: ['gi.app/group/checkAndSeeProposal', {
        contractID: data.groupID,
        data: { proposalHash: data.proposalHash }
      }]
    }
  },
  PAYMENT_RECEIVED (data: { groupID: string, creatorID: string, amount: string, paymentHash: string }) {
    const rootState = sbp('state/vuex/state')
    return {
      title: rootState[data.groupID]?.settings?.groupName || L('Payment received'),
      avatarUserID: data.creatorID,
      body: L('{strong_}{name}{_strong} sent you a {amount} mincome contribution. {strong_}Review and send a thank you note.{_strong}', {
        name: `${CHATROOM_MEMBER_MENTION_SPECIAL_CHAR}${data.creatorID}`,
        amount: data.amount,
        ...LTags('strong')
      }),
      plaintextBody: L('{strong_}{name}{_strong} sent you a {amount} mincome contribution. {strong_}Review and send a thank you note.{_strong}', {
        name: sbp('state/vuex/getters').userDisplayNameFromID(data.creatorID),
        amount: data.amount
      }),
      creatorID: data.creatorID,
      icon: '',
      level: 'info',
      linkTo: `/payments?modal=PaymentDetail&id=${data.paymentHash}`,
      scope: 'group',
      groupID: data.groupID
    }
  },
  PAYMENT_THANKYOU_SENT (data: { groupID: string, creatorID: string, fromMemberID: string, toMemberID: string }) {
    const rootState = sbp('state/vuex/state')
    return {
      title: rootState[data.groupID]?.settings?.groupName || L('Thank you note received'),
      avatarUserID: data.fromMemberID,
      body: L('{strong_}{name}{_strong} sent you a {strong_}thank you note{_strong} for your contribution.', {
        name: `${CHATROOM_MEMBER_MENTION_SPECIAL_CHAR}${data.fromMemberID}`,
        ...LTags('strong')
      }),
      plaintextBody: L('{strong_}{name}{_strong} sent you a {strong_}thank you note{_strong} for your contribution.', {
        name: sbp('state/vuex/getters').userDisplayNameFromID(data.fromMemberID)
      }),
      creatorID: data.fromMemberID,
      icon: '',
      level: 'info',
      linkTo: `/payments?modal=ThankYouNoteModal&from=${data.fromMemberID}&to=${data.toMemberID}`,
      scope: 'group',
      groupID: data.groupID
    }
  },
  MINCOME_CHANGED (data: { groupID: string, creatorID: string, to: number, memberType: string, increased: boolean }) {
    const rootState = sbp('state/vuex/state')
    const { withGroupCurrencyForGroup } = sbp('state/vuex/getters')
    const amount = withGroupCurrencyForGroup(rootState[data.groupID])(data.to)
    return {
      title: rootState[data.groupID]?.settings?.groupName || L('Mincome changes'),
      avatarUserID: data.creatorID,
      body: L('The mincome has changed to {amount}.', { amount }),
      plaintextBody: L('The mincome has changed to {amount}.', { amount }),
      creatorID: data.creatorID,
      icon: 'dollar-sign',
      level: 'info',
      scope: 'group',
      sbpInvocation: ['gi.app/group/displayMincomeChangedPrompt', {
        contractID: data.groupID,
        data: {
          amount: data.to,
          memberType: data.memberType,
          increased: data.increased
        }
      }]
    }
  },
  NEW_DISTRIBUTION_PERIOD (data: { groupID: string, period: string, creatorID: string, memberType: string }) {
    const rootState = sbp('state/vuex/state')
    const { period, creatorID, memberType } = data
    const periodDisplay = humanDate(period, { month: 'short', day: 'numeric', year: 'numeric' })
    const bodyTemplate = {
      // Display the distribution period in the notification message (issue: https://github.com/okTurtles/group-income/issues/1903)
      'pledger': L('A new distribution period ({period}) has started. Please check Payment TODOs.', { period: periodDisplay }),
      'receiver': L('A new distribution period ({period}) has started. Please update your income details if they have changed.', { period: periodDisplay })
    }

    return {
      title: rootState[data.groupID]?.settings?.groupName || L('New distribution period'),
      avatarUserID: creatorID,
      body: bodyTemplate[memberType],
      plaintextBody: bodyTemplate[memberType],
      level: 'info',
      icon: 'coins',
      linkTo: memberType === 'pledger' ? '/payments' : '/contributions?modal=IncomeDetails',
      scope: 'group',
      data: { period }, // is used to check if a notification has already been sent for a particular dist-period
      groupID: data.groupID
    }
  },
  NEAR_DISTRIBUTION_END (data: { groupID: string, period: string }) {
    const rootState = sbp('state/vuex/state')
    return {
      title: rootState[data.groupID]?.settings?.groupName || L('Distribution period ends soon'),
      body: L("Less than 1 week left before the distribution period ends - don't forget to send payments!"),
      plaintextBody: L("Less than 1 week left before the distribution period ends - don't forget to send payments!"),
      level: 'info',
      icon: 'coins',
      linkTo: '/payments',
      scope: 'group',
      data,
      groupID: data.groupID
    }
  },
  NONMONETARY_CONTRIBUTION_UPDATE (
    data: {
      groupID: string,
      creatorID: string,
      updateData: { prev: any[], after: any[] }
    }
  ) {
    const rootState = sbp('state/vuex/state')
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
    const plaintextName = sbp('state/vuex/getters').userDisplayNameFromID(data.creatorID)
    const contributionsFormatted = (entries) => {
      const first = entries[0]
      const len = entries.length
      return entries.length > 1
        ? L('{first} and {rest} more', { first, rest: len - 1 })
        : first
    }
    const bodyContentMap = {
      added: () => L('{name} added non-monetary contribution: {strong_}{added}{_strong}', { name, added: contributionsFormatted(added), ...LTags('strong') }),
      removed: () => L('{name} removed non-monetary contribution: {strong_}{removed}{_strong}', { name, removed: contributionsFormatted(removed), ...LTags('strong') }),
      updated: () => L('{name} updated non-monetary contribution: added {strong_}{added}{_strong} and removed {strong_}{removed}{_strong}', {
        name,
        added: contributionsFormatted(added),
        removed: contributionsFormatted(removed),
        ...LTags('strong')
      })
    }
    const plaintextBodyContentMap = {
      added: () => L('{name} added non-monetary contribution: {strong_}{added}{_strong}', { name: plaintextName, added: contributionsFormatted(added) }),
      removed: () => L('{name} removed non-monetary contribution: {strong_}{removed}{_strong}', { name: plaintextName, removed: contributionsFormatted(removed) }),
      updated: () => L('{name} updated non-monetary contribution: added {strong_}{added}{_strong} and removed {strong_}{removed}{_strong}', {
        name: plaintextName,
        added: contributionsFormatted(added),
        removed: contributionsFormatted(removed)
      })
    }
    return {
      title: rootState[data.groupID]?.settings?.groupName || L('Non-monetary contribution updated'),
      body: bodyContentMap[updateType](),
      plaintextBody: plaintextBodyContentMap[updateType](),
      scope: 'group',
      avatarUserID: data.creatorID,
      level: 'info',
      icon: 'chart-pie',
      linkTo: '/contributions',
      groupID: data.groupID
    }
  }
}: { [key: string]: ((data: Object) => NotificationTemplate) })
