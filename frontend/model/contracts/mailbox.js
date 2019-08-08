'use strict'

// import Vue from 'vue'
import { DefineContract } from './Contract.js'
import {
  objectOf,
  arrayOf,
  string,
  object,
  optional
} from '~/frontend/utils/flowTyper.js'

export default DefineContract({
  name: 'gi.contracts/mailbox',
  contract: {
    validate: object,
    process (state, { data }) {
      state.messages = []
    }
  },
  actions: {
    'gi.contracts/mailbox/postMessage': {
      validate: objectOf({
        messageType: string,
        from: string,
        message: optional(string),
        headers: optional(arrayOf(string))
      }),
      constants: {
        TypeInvite: 'Invite',
        TypeMessage: 'Message',
        TypeProposal: 'Proposal'
      },
      process (state, { data, meta, hash }) {
        state.messages.push({ data, meta, hash })
      }
    },
    'gi.contracts/mailbox/authorizeSender': {
      validate: objectOf({
        sender: string
      }),
      process (state, { data }) {
        // TODO: maybe replace this via OP_KEY_*?
        throw new Error('unimplemented!')
      }
    }
  }
})

/*
export default DefineContract({
  'MailboxContract': {
    isConstructor: true,
    validate: object,
    vuexModuleConfig: {
      initialState: { messages: [] },
      mutation: function (state, { data }) {}
    }
  },
  'MailboxPostMessage': {
    constants: {
      TypeInvite: 'Invite',
      TypeMessage: 'Message',
      TypeProposal: 'Proposal'
    },
    validate: objectOf({
      messageType: string,
      from: string,
      message: optional(string),
      headers: optional(arrayOf(string))
    }),
    vuexModuleConfig: {
      mutation: (state, { data, meta, hash }) => {
        state.messages.push({ data, meta, hash })
      }
    }
  },
  'MailboxAuthorizeSender': {
    validate: objectOf({
      sender: string
    }),
    vuexModuleConfig: {
      mutation: (state, { data }) => {
        throw new Error('unimplemented!')
        // state.authorizations[contracts.MailboxAuthorizeSender.authorization].data = data.sender
      }
    }
  }
})
*/
