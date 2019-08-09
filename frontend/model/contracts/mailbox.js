'use strict'

// import Vue from 'vue'
import { DefineContract } from './Contract.js'
import { objectOf, arrayOf, string, object, unionOf, literalOf, optional } from '~/frontend/utils/flowTyper.js'

export const TYPE_INVITE = 'invite'
export const TYPE_MESSAGE = 'message'
export const TYPE_PROPOSAL = 'proposal'

export const messageType = unionOf(literalOf(TYPE_INVITE), literalOf(TYPE_MESSAGE), literalOf(TYPE_PROPOSAL))

DefineContract({
  name: 'gi.contracts/mailbox',
  contract: {
    validate: object,
    process (state, { data }) {
      state.messages = []
    }
  },
  metadata: {
    validate: objectOf({
      createdDate: string
    }),
    create () {
      return {
        createdDate: new Date().toISOString()
      }
    }
  },
  actions: {
    'gi.contracts/mailbox/postMessage': {
      validate: objectOf({
        messageType: messageType,
        from: string,
        message: optional(string),
        // TODO: these should be optional(object)
        headers: optional(arrayOf(string))
      }),
      process (state, { data, meta, hash }) {
        state.messages.push({ data, meta, hash })
      }
    },
    'gi.contracts/mailbox/authorizeSender': {
      validate: objectOf({
        sender: string
      }),
      process (state, { data }) {
        // TODO: replace this via OP_KEY_*?
        throw new Error('unimplemented!')
      }
    }
  }
})
