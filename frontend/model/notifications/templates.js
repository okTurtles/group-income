import L from '@view-utils/translations.js'

// Notification templates based on issue #663
// TODO/REVIEW - list might be stale / incomplete.

export const MEMBER_ADDED = ({ username }) => {
  const name = 'todo' // getDisplayName(username)
  const avatarUrl = 'todo.jpg'
  return {
    avatarUrl,
    avatarIcon: 'money',
    copy: L('Your group as a new member! Sai hi to {name}', {
      name: `<strong>${name}</strong>`
    }),
    linkTo: '/chat'
  }
}

export const MEMBER_REMOVED = ({ name }) => ({
  copy: L('{name} was kicked out of the group. Contributions were updated accordingly.', {
    name: `<strong>${name}</strong>`
  }),
  linkTo: '/contributions'
})

export const MEMBER_LEFT = ({ name }) => ({
  copy: L('{name} has left your group. Contributions were updated accordingly.', {
    name: `<strong>${name}</strong>`
  }),
  linkTo: '/contributions'
})

export const INCOMDE_DETAILS_OLD = ({ monthsCount }) => ({
  copy: L("You haven't updated your income details in {n} months. Would you like to review them now?", {
    n: monthsCount
  }),
  linkTo: '/contributions/TODO-LINK-MODAL'
})

export const SEND_CONTRIBUTION = ({ month }) => ({
  copy: L('Do not forget to send your {month} contributions.', {
    month: `<strong>${month}</strong>`
  }),
  linkTo: '/contributions'
})

export const PROPOSAL_NEW = ({ creator, type }) => {
  const member = `<strong>${creator}</strong>`
  const copyTypesMap = {
    mincome: L('{member} proposed to change the group mincome. Vote now!', { member }), // @mmbotelho copy changed
    addMember: L('{member} proposed to add members to the group. Vote now!', { member }),
    removeMember: L('{member} proposed to remove a member from the group. Vote now!', { member }),
    votingRule: L('{member} proposed to change the group voting system. Vote now!', { member })
  }

  return {
    copy: copyTypesMap[type],
    linkTo: '/dashboard#proposals'
  }
}
