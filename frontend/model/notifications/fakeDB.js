// fake DB response with some notifications already filtered to current user.
export default {
  '3213': {
    timestamp: 1590819407327,
    type: 'MEMBER_ADDED',
    data: {
      username: 'kate'
    }
  },
  '1032': {
    timestamp: 1590822227327,
    type: 'CONTRIBUTION_REMINDER',
    data: {
      monthstamp: '04'
    }
  },
  '7393': {
    timestamp: 1590815807327,
    type: 'NEW_PROPOSAL',
    data: {
      creator: 'greg',
      subtype: 'CHANGE_MINCOME',
      value: '$1000'
    }
  },
  '2139': {
    timestamp: 1590815807327,
    type: 'MEMBER_REMOVED',
    data: {
      username: 'bot'
    }
  },
  '1221': {
    timestamp: 1590805007327,
    type: 'MEMBER_ADDED',
    data: {
      username: 'bot'
    }
  },
  '4321': {
    timestamp: 1590725807327,
    type: 'MEMBER_ADDED',
    data: {
      username: 'greg'
    }
  },
  '7981': {
    timestamp: 1589699807327,
    type: 'INCOME_DETAILS_OLD'
  }
}
