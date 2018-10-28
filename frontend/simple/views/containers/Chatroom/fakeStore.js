// NOTE: This fakeStore is just for layout purposes
// The data structure for each message was based on public Messenger, Slack and Discord APIs

// Messages - private 1:1 messages
export const privateMessagesSortedByTime = [333, 444, 555, 111, 222]

export const currentUserId = '000'

export const users = {
  111: {
    name: 'johnn',
    displayName: 'John Mars',
    picture: 'http://localhost:8000/simple/assets/images/default-avatar.png',
    unreadCount: 0,
    description: 'You and John are both part of Dreamers group'
  },
  222: {
    name: 'hlenon',
    displayName: 'Hugo Lenon',
    picture: 'http://localhost:8000/simple/assets/images/default-avatar.png',
    unreadCount: 0,
    description: null
  },
  333: {
    name: 'liliabt',
    displayName: 'Lilia Bouvet',
    picture: 'http://localhost:8000/simple/assets/images/default-avatar.png',
    unreadCount: 1,
    description: null
  },
  444: {
    name: 'rickyricky',
    displayName: 'Rick Eggs',
    picture: 'http://localhost:8000/simple/assets/images/default-avatar.png',
    unreadCount: 2,
    description: null
  },
  555: {
    name: 'ericrock',
    displayName: 'Eric Rock',
    picture: 'http://localhost:8000/simple/assets/images/default-avatar.png',
    unreadCount: 0,
    description: 'You and Eric are both part of Dreamers group'
  }
}

// Private Messages Conversations
export const messageConversations = {
  333: [
    {
      from: '333',
      text: 'Hello:',
      sent: '2018-10-27T14:51:00.256Z',
      unread: true
    }
  ],
  444: [
    {
      from: '444',
      text: 'check this out:',
      sent: '2018-10-27T14:51:00.256Z',
      unread: false
    },
    {
      from: '444',
      text: 'https://motherfuckingwebsite.com/',
      sent: '2018-10-27T14:58:14.256Z',
      unread: false
    },
    {
      from: currentUserId,
      text: 'ahahah there is one even better',
      sent: '2018-10-27T14:59:00.256Z',
      unread: false
    },
    {
      from: currentUserId,
      text: 'http://bettermotherfuckingwebsite.com/',
      sent: '2018-10-27T14:59:20.256Z',
      unread: false
    },
    {
      from: '444',
      text: 'Epic! 💥 Actually there a lot of them',
      sent: '2018-10-27T14:59:55.256Z',
      unread: true
    },
    {
      from: '444',
      text: 'this is great!',
      sent: '2018-10-27T14:59:55.256Z',
      unread: true
    }
  ],
  555: [
    {
      from: '555',
      text: 'Hi!',
      sent: '2018-10-27T14:51:00.256Z',
      unread: false
    },
    {
      from: currentUserId,
      text: 'Hey Eric!',
      sent: '2018-10-27T14:58:14.256Z',
      unread: false
    },
    {
      from: '555',
      text: 'I added you to my group',
      sent: '2018-10-27T14:59:00.256Z',
      unread: false
    },
    {
      from: '555',
      text: 'It\'s called Dreamas',
      sent: '2018-10-27T14:59:20.256Z',
      unread: false
    },
    {
      from: currentUserId,
      text: 'Cool!',
      sent: '2018-10-27T14:59:55.256Z',
      unread: false
    }
  ]
}
// ----------- GROUP CHAT --------- //

// Group Chat - channels basic info
export const groupChannels = {
  c0: {
    displayName: 'Lounge',
    private: true,
    description: 'The main channel where everyone can chat'
  },
  c1: {
    displayName: 'Lounge',
    private: true,
    description: 'Lets plan our next summer road trip'
  }
}

// Group Chat - each channel conversations
export const channelConversations = {
  c0: [
    {
      from: '444',
      text: 'Hi everyone 👋',
      sent: '2018-10-27T14:51:00.256Z',
      unread: false
    }
  ],
  c1: [
    {
      from: '444',
      text: 'Hi guys',
      sent: '2018-10-27T14:51:00.256Z',
      unread: true
    },
    {
      from: '444',
      text: 'lets know where do you wanna go this summer: 🏕 or 🏂?',
      sent: '2018-10-27T14:51:00.256Z',
      unread: true
    }
  ]
}
