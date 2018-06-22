'use strict'

import {DefineContract} from '../utils.js'

export default DefineContract({
  'MailboxContract': {
    constructor: true,
    validate: function (data) {

    },
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
    validate: function (data) {
      // ['from', 'string'],
      // ['headers', 'string', 'repeated'],
      // ['messageType', 'string'],
      // ['message', 'string'],
      // ['sentDate', 'string'],
      // ['read', 'bool']
    },
    vuex: {
      mutation: (state, {data, hash}) => {
        state.messages.push({data, hash})
      }
    }
  },
  'MailboxAuthorizeSender': {
    validate: function (data) {
      // ['sender', 'string']
    },
    vuex: {
      mutation: (state, {data}) => {
        throw new Error('unimplemented!')
        // state.authorizations[contracts.MailboxAuthorizeSender.authorization].data = data.sender
      }
    }
  }
})
