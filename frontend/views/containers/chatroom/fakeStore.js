// NOTE: This fakeStore is just for layout purposes
import {
  PROPOSAL_GROUP_SETTING_CHANGE,
  PROPOSAL_INVITE_MEMBER,
  PROPOSAL_PROPOSAL_SETTING_CHANGE,
  STATUS_PASSED,
  STATUS_FAILED,
  STATUS_EXPIRED,
  STATUS_CANCELLED
} from '@model/contracts/voting/constants.js'

export const chatTypes = {
  INDIVIDUAL: 'INDIVIDUAL',
  GROUP: 'GROUP'
}

export const messageTypes = {
  INTERACTIVE: 'INTERACTIVE',
  NOTIFICATION: 'NOTIFICATION'
}

export const interactionType = {
  CHAT_NEW_MEMBER: 'Chat new member',
  CHAT_REMOVE_MEMBER: 'Chat remove member',
  CHAT_DELETE: 'Chat delete',
  CHAT_NAME_UPDATE: 'Update channel name',
  CHAT_DESCRIPTION_UPDATE: 'Update channel description',
  VOTED: 'voted'
}

// Just for static layout purposes, the currentUserId is '000'
export const currentUserId = '000'

// Messages - private 1:1 messages
export const individualMessagesSorted = ['GIBot', 555, 333, 444, 111, 222]

export const users = {
  'GIBot': {
    id: 'GIBot',
    name: 'gibot',
    displayName: 'GIBot',
    picture: '/assets/images/group-income-icon-transparent-circle.png',
    unreadCount: 1,
    description: 'I’m here to keep you update while you are away'
  },
  '111': {
    id: '111',
    name: 'johnn',
    displayName: 'John Mars',
    picture: '/assets/images/user-avatar-default.png',
    unreadCount: 0,
    description: 'You and John are both part of Dreamers group'
  },
  '222': {
    id: '222',
    name: 'hlenon',
    displayName: 'Hugo Lenon',
    picture: '/assets/images/user-avatar-default.png',
    unreadCount: 0,
    description: null
  },
  '333': {
    id: '333',
    name: 'liliabt',
    displayName: 'Lilia Bouvet',
    picture: '/assets/images/user-avatar-default.png',
    unreadCount: 0,
    description: null
  },
  '444': {
    id: '444',
    name: 'rickyricky',
    displayName: 'Rick Eggs',
    picture: '/assets/images/user-avatar-default.png',
    unreadCount: 0,
    description: null
  },
  '555': {
    id: '555',
    name: 'ericrock',
    displayName: 'Eric Rock',
    picture: '/assets/images/user-avatar-default.png',
    unreadCount: 1,
    description: 'You and Eric are both part of Dreamers group'
  }
}

// Private Messages Conversations
export const individualConversations = {
  'GIBot': [
    {
      from: 'GIBot',
      text: 'I\'ve noticed you still didn’t <a href="/profile">add a picture to your profile</a>.\nLet other knows who you are',
      time: '3:24 AM'
    },
    {
      from: 'GIBot',
      text: 'You were invited to join <a href="/join-group">The Dreamers group</a>.',
      time: '3:24 AM'
    },
    {
      from: 'GIBot',
      text: 'There\'s <a href="/dashboard">a new member proposal</a> to the Dreamers.',
      time: '3:24 AM'
    },
    {
      from: 'GIBot',
      text: 'I’ve noticed you still have to <a href="/contributions">add your Income Details at Dreamers</a>.\nIt’s a mandatory information for you to be fully part of the group',
      time: '3:24 AM',
      unread: true
    }
  ],
  '333': [
    {
      from: '333',
      text: 'Hello',
      time: '3:24 AM'
    }
  ],
  '444': [
    {
      from: '444',
      text: 'check this out:',
      time: '3:24 AM'
    },
    {
      from: '444',
      text: 'https://groupincome.org/',
      time: '3:24 AM'
    },
    {
      from: currentUserId,
      text: 'ahahah there is one even better',
      time: '3:24 AM'
    },
    {
      from: currentUserId,
      text: 'https://groupincome.org/team/',
      time: '3:24 AM'
    },
    {
      from: '444',
      text: 'Epic! 💥 Actually there a lot of them',
      time: '3:24 AM'
    },
    {
      from: '444',
      text: 'this is great!',
      time: '3:24 AM'
    },
    {
      from: currentUserId,
      text: 'indeed',
      time: '3:24 AM'
    },
    {
      from: '444',
      text: 'I wonder who did it...',
      time: '3:24 AM'
    },
    {
      from: currentUserId,
      text: 'Hum...',
      time: '3:24 AM'
    },
    {
      from: currentUserId,
      text: 'Maybe looking into the source',
      time: '3:24 AM'
    },
    {
      from: '444',
      text: 'Good idea, lets check...',
      time: '3:24 AM'
    },
    {
      from: '444',
      text: 'No still no luck',
      time: '3:24 AM'
    },
    {
      from: currentUserId,
      text: 'smart guy',
      time: '3:24 AM'
    },
    {
      from: '444',
      text: 'wow',
      time: '3:24 AM'
    },
    {
      from: '444',
      text: 'this is funny!',
      time: '3:24 AM'
    }
  ],
  '555': [
    {
      from: '555',
      text: 'Hi!',
      time: '3:24 AM'
    },
    {
      from: currentUserId,
      text: 'Hey Eric!',
      time: '3:24 AM'
    },
    {
      from: '555',
      text: 'I\'m adding you to my group',
      time: '3:24 AM'
    },
    {
      from: '555',
      text: 'It\'s called Dreamears',
      time: '3:24 AM'
    },
    {
      from: messageTypes.INTERACTIVE,
      id: 'invite123',
      time: '3:24 AM'
    },
    {
      from: currentUserId,
      text: 'Cool!',
      time: '3:24 AM'
    },
    {
      from: '555',
      text: 'You\'re welcome 😃',
      time: '3:24 AM',
      unread: true
    }
  ],
  '111': [
    {
      from: currentUserId,
      text: 'Hey there',
      time: '3:24 AM'
    },
    {
      from: currentUserId,
      text: 'Cool you joined GI too 🙌',
      time: '3:24 AM'
    }
  ]
}

// ----------- GROUP CHAT --------- //

export const groupA = {
  channelsSorted: ['c0', 'c1'],
  channels: {
    c0: {
      id: 'c0',
      name: 'lounge',
      displayName: 'lounge',
      unreadCount: 0,
      private: false,
      type: chatTypes.GROUP,
      description: 'A place for everyone to chat'
    },
    c1: {
      id: 'c1',
      name: 'summer-trip',
      displayName: 'summer-trip',
      unreadCount: 2,
      private: true,
      description: 'Lets plan our next summer road trip'
    }
  },
  founders: [333, 555],
  members: [333, 555, 222],
  conversations: {
    c0: [
      {
        time: (new Date(2020, 5, 22, 11, 43, 42): Date),
        from: '555',
        text: 'Hi 👋'
      },
      {
        time: (new Date(2020, 7, 23, 11, 34, 42): Date),
        from: '444',
        text: 'It’s missing Sandy'
      },
      {
        time: (new Date(2020, 7, 23, 12, 23, 42): Date),
        from: '555',
        text: 'Yeah, looking for her username, one second'
      },
      {
        time: (new Date(2020, 7, 23, 12, 45, 42): Date),
        from: messageTypes.NOTIFICATION,
        id: 'youAddedToDreamersGroup',
        text: 'You are now part of The Dreamers group.'
      },
      {
        time: (new Date(2020, 7, 30, 13, 25, 42): Date),
        from: '555',
        text: 'Guys, should we add Katty to the group?'
      },
      {
        time: (new Date(2020, 7, 31, 14, 28, 42): Date),
        from: '000',
        text: 'There’s no problem to me',
        unread: true,
        emoticons: {
          '💖': ['555'],
          '👋': ['000']
        }
      },
      {
        time: (new Date(2020, 7, 31, 17, 32, 42): Date),
        from: messageTypes.INTERACTIVE,
        id: 'inviteKattyId',
        unread: true
      }
    ],
    c1: [
      {
        time: (new Date(2020, 7, 30, 17, 32, 42): Date),
        from: '444',
        text: 'Hi guys'
      },
      {
        time: (new Date(2020, 7, 31, 17, 32, 42): Date),
        from: '444',
        text: 'Lets know where we\'ll go this summer: 🏕 or 🏂?',
        unread: true
      }
    ]
  }
}

export const fakeEvents = {
  youAddedToDreamersGroup: {
    interactionType: interactionType.CHAT_NEW_MEMBER,
    from: '444',
    to: '444'
  }
}

export const fakeProposals = {
  inviteKattyId: {
    proposalType: PROPOSAL_INVITE_MEMBER,
    proposalData: {
      member: 'Katty',
      reason: 'She\'s cool'
    },
    status: STATUS_FAILED,
    from: '555',
    to: '444'
  },
  changeMincomeId: {
    proposalType: PROPOSAL_GROUP_SETTING_CHANGE,
    status: STATUS_PASSED,
    proposalData: {
      setting: 'mincomeAmount',
      proposedValue: 300,
      currentValue: 200,
      mincomeCurrency: 'USD',
      reason: 'Because why not'
    }
  },
  changeVotingRuleId: {
    proposalType: PROPOSAL_PROPOSAL_SETTING_CHANGE,
    status: STATUS_EXPIRED,
    proposalData: {
      setting: 'votingRule'
    }
  },
  changeVotingSystemId: {
    proposalType: PROPOSAL_PROPOSAL_SETTING_CHANGE,
    status: STATUS_CANCELLED,
    proposalData: {
      setting: 'votingSystem'
    }
  }
}
