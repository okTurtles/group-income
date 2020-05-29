import L from '@view-utils/translations.js'

// Notification templates based on issue #663
// TODO/REVIEW - list might be stale / incomplete.

export const MEMBER_ADDED = ({ username }) => {
  const name = 'todo' // getDisplayName(username)
  const avatarUrl = 'todo.jpg'
  return {
    avatarUrl,
    icon: 'user-plus',
    level: 'info',
    text: L('The group has a new member! Sai hi to {name}!', {
      name: `<strong>${name}</strong>`
    }),
    linkTo: '/chat',
    date: '1h'
  }
}

export const MEMBER_REMOVED = ({ username }) => {
  const name = 'todo' // getDisplayName(username)
  const avatarUrl = 'todo.jpg'
  return {
    avatarUrl,
    icon: 'user-minus',
    level: 'danger',
    // REVIEW - Not only contributions, but also proposals.
    text: L('{name} was kicked out of the group. Contributions were updated accordingly.', {
      name: `<strong>${name}</strong>`
    }),
    linkTo: '/contributions'
  }
}

export const MEMBER_LEFT = ({ username }) => {
  const name = 'todo' // getDisplayName(username)
  const avatarUrl = 'todo.jpg'
  return {
    avatarUrl,
    icon: 'icon-minus',
    level: 'info',
    text: L('{name} has left your group. Contributions were updated accordingly.', {
      name: `<strong>${name}</strong>`
    }),
    linkTo: '/contributions'
  }
}

export const INCOMDE_DETAILS_OLD = ({ monthsCount }) => {
  // const name = 'todo' // getDisplayName(username)
  const avatarUrl = 'todo.jpg'
  return {
    avatarUrl,
    icon: 'coins',
    level: 'info',
    text: L("You haven't updated your income details in {n} months. Would you like to review them now?", {
      n: monthsCount
    }),
    linkTo: '/contributions/TODO-LINK-MODAL'
  }
}

export const SEND_CONTRIBUTION = ({ month }) => {
  // const name = 'todo' // getDisplayName(username)
  const avatarUrl = 'todo.jpg'
  return {
    avatarUrl,
    icon: 'coins',
    level: 'info',
    text: L('Do not forget to send your {month} contributions.', {
      month: `<strong>${month}</strong>`
    }),
    linkTo: '/contributions'
  }
}

export const PROPOSAL_NEW = ({ creator, type }) => {
  const avatarUrl = 'todo.jpg'
  const member = `<strong>${creator}</strong>`
  const textMap = {
    mincome: L('{member} proposed to change the group mincome. Vote now!', { member }), // @mmbotelho copy changed
    addMember: L('{member} proposed to add members to the group. Vote now!', { member }),
    removeMember: L('{member} proposed to remove a member from the group. Vote now!', { member }),
    votingRule: L('{member} proposed to change the group voting system. Vote now!', { member })
  }

  const iconMap = {
    mincome: 'coins',
    addMember: 'user-plus',
    removeMember: 'user-minus',
    votingRule: 'vote-yea'
  }

  return {
    avatarUrl,
    icon: iconMap[type],
    level: 'info',
    text: textMap[type],
    linkTo: '/dashboard#proposals'
  }
}
