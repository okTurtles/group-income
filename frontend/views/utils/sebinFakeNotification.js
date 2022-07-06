import sbp from '@sbp/sbp'

const fakeNotifications = [
  {
    type: 'MEMBER_ADDED',
    data: {
      username: 'greg'
    }
  },
  {
    type: 'MEMBER_ADDED',
    data: {
      username: 'kate'
    }
  },
  {
    type: 'NEW_PROPOSAL',
    data: {
      creator: 'greg',
      subtype: 'CHANGE_MINCOME',
      value: '$1000'
    }
  },
  {
    type: 'MEMBER_ADDED',
    data: {
      username: 'bot'
    }
  },
  {
    type: 'NEW_PROPOSAL',
    data: {
      creator: 'kate',
      subtype: 'REMOVE_MEMBER'
    }
  },
  {
    type: 'MEMBER_REMOVED',
    data: {
      username: 'jake'
    }
  }
]

sbp('sbp/selectors/register', {
  'gi.sebin/fake-notification/emit': () => {
    const { currentGroupId } = sbp('state/vuex/state')

    for (const { type, data = {} } of fakeNotifications) {
      sbp('gi.notifications/emit', type, {
        ...data,
        groupID: currentGroupId
      })
    }
  }
})
