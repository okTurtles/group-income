'use strict'

import {DefineContract} from '../utils.js'

export default DefineContract({
  'MailboxContract': {
    constructor: true,
    validate: function (data) {},
    vuex: {
      mutation: (state, {data}) => {
        Object.assign(state, {messages: []}, data)
      }
    }
  },
  'MailboxPostMessage': {
    constants: {
      TypeInvite: 'Invite',
      TypeMessage: 'Message',
      TypeProposal: 'Proposal'
    },
    validate: function (data) {},
    vuex: {
      mutation: (state, {data, hash}) => {
        state.messages.push({data, hash})
      }
    }
  },
  'MailboxAuthorizeSender': {
    validate: function (data) {
      throw new Error('unimplemented!')
    },
    vuex: {
      mutation: (state, {data}) => {
        throw new Error('unimplemented!')
        // state.authorizations[contracts.MailboxAuthorizeSender.authorization].data = data.sender
      }
    }
  }
})
