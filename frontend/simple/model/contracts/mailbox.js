'use strict'

import { DefineContract } from '../utils.js'
import {
  objectOf,
  arrayOf,
  string,
  object,
  optional
} from 'flow-typer-js'

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
      sentDate: string,
      message: optional(string),
      headers: optional(arrayOf(string))
    }),
    vuexModuleConfig: {
      mutation: (state, { data, hash }) => {
        state.messages.push({ data, hash })
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
