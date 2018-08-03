'use strict'

import {DefineContract} from '../utils.js'

export default DefineContract({
  'MailboxContract': {
    isConstructor: true,
    validate: function (data) {},
    vuexModuleConfig: {
      initialState: {messages: []},
      mutation: function (state, {data}) {}
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
    vuexModuleConfig: {
      mutation: (state, {data, hash}) => {
        state.messages.push({data, hash})
      }
    }
  },
  'MailboxAuthorizeSender': {
    validate: function (data) {
      // ['sender', 'string']
    },
    vuexModuleConfig: {
      mutation: (state, {data}) => {
        throw new Error('unimplemented!')
        // state.authorizations[contracts.MailboxAuthorizeSender.authorization].data = data.sender
      }
    }
  }
})
