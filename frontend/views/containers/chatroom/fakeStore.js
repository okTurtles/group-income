// NOTE: This fakeStore is just for layout purposes

export const chatTypes = {
  INDIVIDUAL: 'INDIVIDUAL',
  GROUP: 'GROUP'
}

export const messageTypes = {
  INTERACTIVE: 'INTERACTIVE',
  NOTIFICATION: 'NOTIFICATION'
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
    picture: '/assets/images/avatar-default.png',
    unreadCount: 0,
    description: 'You and John are both part of Dreamers group'
  },
  '222': {
    id: '222',
    name: 'hlenon',
    displayName: 'Hugo Lenon',
    picture: '/assets/images/avatar-default.png',
    unreadCount: 0,
    description: null
  },
  '333': {
    id: '333',
    name: 'liliabt',
    displayName: 'Lilia Bouvet',
    picture: '/assets/images/avatar-default.png',
    unreadCount: 0,
    description: null
  },
  '444': {
    id: '444',
    name: 'rickyricky',
    displayName: 'Rick Eggs',
    picture: '/assets/images/avatar-default.png',
    unreadCount: 0,
    description: null
  },
  '555': {
    id: '555',
    name: 'ericrock',
    displayName: 'Eric Rock',
    picture: '/assets/images/avatar-default.png',
    unreadCount: 1,
    description: 'You and Eric are both part of Dreamers group'
  }
}

// Private Messages Conversations
export const individualConversations = {
  'GIBot': [
    {
      from: 'GIBot',
      text: 'I\'ve noticed you still didn’t <a href="/profile">add a picture to your profile</a>.\nLet other knows who you are'
    },
    {
      from: 'GIBot',
      text: 'You were invited to join <a href="/join-group">The Dreamers group</a>.'
    },
    {
      from: 'GIBot',
      text: 'There\'s <a href="/dashboard">a new member proposal</a> to the Dreamers.'
    },
    {
      from: 'GIBot',
      text: 'I’ve noticed you still have to <a href="/contributions">add your Income Details at Dreamers</a>.\nIt’s a mandatory information for you to be fully part of the group',
      unread: true
    }
  ],
  '333': [
    {
      from: '333',
      text: 'Hello'
    }
  ],
  '444': [
    {
      from: '444',
      text: 'check this out:'
    },
    {
      from: '444',
      text: 'https://motherfuckingwebsite.com/'
    },
    {
      from: currentUserId,
      text: 'ahahah there is one even better'
    },
    {
      from: currentUserId,
      text: 'http://bettermotherfuckingwebsite.com/'
    },
    {
      from: '444',
      text: 'Epic! 💥 Actually there a lot of them'
    },
    {
      from: '444',
      text: 'this is great!'
    },
    {
      from: currentUserId,
      text: 'indeed'
    },
    {
      from: '444',
      text: 'I wonder who did it...'
    },
    {
      from: currentUserId,
      text: 'Hum...'
    },
    {
      from: currentUserId,
      text: 'Maybe looking into the source'
    },
    {
      from: '444',
      text: 'Good idea, lets check...'
    },
    {
      from: '444',
      text: '<!-- FOR THE CURIOUS: This site was made by @thebarrytone. Don\'t tell my mom. -->'
    },
    {
      from: currentUserId,
      text: 'smart guy'
    },
    {
      from: '444',
      text: 'wow'
    },
    {
      from: '444',
      text: 'this is funny!'
    }
  ],
  '555': [
    {
      from: '555',
      text: 'Hi!'
    },
    {
      from: currentUserId,
      text: 'Hey Eric!'
    },
    {
      from: '555',
      text: 'I\'m adding you to my group'
    },
    {
      from: '555',
      text: 'It\'s called Dreamears'
    },
    {
      from: messageTypes.INTERACTIVE,
      id: 'invite123'
    },
    {
      from: currentUserId,
      text: 'Cool!'
    },
    {
      from: '555',
      text: 'You\'re welcome 😃',
      unread: true
    }
  ],
  '111': [
    {
      from: currentUserId,
      text: 'Hey there'
    },
    {
      from: currentUserId,
      text: 'Cool you joined GI too 🙌'
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
      description: 'A place for everyone at {channel} to chat'
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
        from: '555',
        text: 'Hi 👋'
      },
      {
        from: '444',
        text: 'It’s missing Sandy'
      },
      {
        from: '555',
        text: 'Yeah, looking for her username, one second'
      },
      {
        from: messageTypes.NOTIFICATION,
        text: 'You are now part of The Dreamers group.'
      },
      {
        from: '555',
        text: 'Guys, should we add Katty to the group?'
      },
      {
        from: '000',
        text: 'There’s no problem to me'
      },
      {
        from: messageTypes.INTERACTIVE,
        id: 'inviteKattyId'
      }
    ],
    c1: [
      {
        from: '444',
        text: 'Hi guys'
      },
      {
        from: '444',
        text: 'Lets know where we\'ll go this summer: 🏕 or 🏂?',
        unread: true
      }
    ]
  }
}
