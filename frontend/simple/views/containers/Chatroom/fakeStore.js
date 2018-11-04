// NOTE: This fakeStore is just for layout purposes

// Messages - private 1:1 messages
export const privateMessagesSortedByTime = [333, 444, 555, 111, 222]

// Just for static layout purposes, the currentUserId is '000'
export const currentUserId = '000'

export const users = {
  111: {
    id: '111',
    name: 'johnn',
    displayName: 'John Mars',
    picture: 'http://localhost:8000/simple/assets/images/default-avatar.png',
    unreadCount: 0,
    description: 'You and John are both part of Dreamers group'
  },
  222: {
    id: '222',
    name: 'hlenon',
    displayName: 'Hugo Lenon',
    picture: 'http://localhost:8000/simple/assets/images/default-avatar.png',
    unreadCount: 0,
    description: null
  },
  333: {
    id: '333',
    name: 'liliabt',
    displayName: 'Lilia Bouvet',
    picture: 'http://localhost:8000/simple/assets/images/default-avatar.png',
    unreadCount: 1,
    description: null
  },
  444: {
    id: '444',
    name: 'rickyricky',
    displayName: 'Rick Eggs',
    picture: 'http://localhost:8000/simple/assets/images/default-avatar.png',
    unreadCount: 2,
    description: null
  },
  555: {
    id: '555',
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
      text: 'Hello'
    }
  ],
  444: [
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
      text: 'this is genial!'
    }
  ],
  555: [
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
      from: 'interactive',
      id: 'invite123'
    },
    {
      from: currentUserId,
      text: 'Cool!'
    }
  ]
}
