import L from '~/frontend/views/utils/translations.js'
import { monthName } from '~/frontend/utils/time.js'

type NewProposalType =
  | 'ADD_MEMBER'
  | 'CHANGE_MINCOME'
  | 'CHANGE_VOTING_RULE'
  | 'REMOVE_MEMBER';

type NotificationLevel = 'danger' | 'info';

export type NotificationTemplate = {
  +body: string;
  +icon: string;
  +level: NotificationLevel;
  +linkTo: string;
  +creator?: string;
  +subtype?: string;
}

// Note: this escaping is not intended as a protection against XSS.
// It is only done to enable correct rendering of special characters in usernames.
// To guard against XSS when rendering usernames, use the `v-safe-html` directive.
const escapeForHtml = (text) => text.replace(/[<>&]/g, '\\$&')
const strong = (text) => `<strong>${escapeForHtml(text)}</strong>`

export default ({
  CONTRIBUTION_REMINDER (data: { monthstamp: string }) {
    return {
      // REVIEW @mmbotelho - Rename contributions to payments?
      // TODO: Translate `month` when English is not the current language.
      body: L('Do not forget to send your {month} contributions.', {
        month: strong(monthName(data.monthstamp))
      }),
      icon: 'coins',
      level: 'info',
      linkTo: '/payments'
    }
  },
  INCOME_DETAILS_OLD (data: { months: number }) {
    return {
      body: L("You haven't updated your income details in more than {months} months. Would you like to review them now?", {
        // Avoid displaying decimals.
        months: Math.floor(data.months)
      }),
      icon: 'coins',
      level: 'info',
      linkTo: '/contributions/TODO-LINK-MODAL'
    }
  },
  MEMBER_ADDED (data: { username: string }) {
    return {
      body: L('The group has a new member. Say hi to {name}!', {
        name: strong(data.username)
      }),
      icon: 'user-plus',
      level: 'info',
      linkTo: '/group-chat/XXXX'
    }
  },
  MEMBER_LEFT (data: { username: string }) {
    return {
      body: L('{name} has left your group. Contributions were updated accordingly.', {
        name: strong(data.username)
      }),
      icon: 'icon-minus',
      level: 'info',
      linkTo: '/contributions'
    }
  },
  MEMBER_REMOVED (data: { username: string }) {
    return {
      // REVIEW @mmbotelho - Not only contributions, but also proposals.
      body: L('{name} was kicked out of the group. Contributions were updated accordingly.', {
        name: strong(data.username)
      }),
      icon: 'user-minus',
      level: 'danger',
      linkTo: '/contributions'
    }
  },
  NEW_PROPOSAL (data: { creator: string, subtype: NewProposalType }) {
    const bodyTemplateMap = {
      ADD_MEMBER: (creator: string) => L('{member} proposed to add members to the group. Vote now!', { member: strong(creator) }),
      CHANGE_MINCOME: (creator: string) => L('{member} proposed to change the group mincome. Vote now!', { member: strong(creator) }),
      CHANGE_VOTING_RULE: (creator: string) => L('{member} proposed to change the group voting system. Vote now!', { member: strong(creator) }),
      REMOVE_MEMBER: (creator: string) => L('{member} proposed to remove a member from the group. Vote now!', { member: strong(creator) })
    }

    const iconMap = {
      ADD_MEMBER: 'user-plus',
      CHANGE_MINCOME: 'coins',
      CHANGE_VOTING_RULE: 'vote-yea',
      REMOVE_MEMBER: 'user-minus'
    }

    return {
      body: bodyTemplateMap[data.subtype](data.creator),
      creator: data.creator,
      icon: iconMap[data.subtype],
      level: 'info',
      linkTo: '/dashboard#TODO-proposals',
      subtype: data.subtype
    }
  }
}: { [key: string]: ((data: Object) => NotificationTemplate) })
