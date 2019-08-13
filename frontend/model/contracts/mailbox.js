'use strict'

import Vue from 'vue'
import { DefineContract } from './Contract.js'
import { objectOf, string, object, unionOf, literalOf, optional } from '~/frontend/utils/flowTyper.js'

export const TYPE_MESSAGE = 'message'
export const TYPE_FRIEND_REQ = 'friend-request'

export const messageType = unionOf(...[TYPE_MESSAGE, TYPE_FRIEND_REQ].map(k => literalOf(k)))

DefineContract({
  name: 'gi.contracts/mailbox',
  contract: {
    validate: object, // TODO: define this
    process (state, { data }) {
      for (const key in data) {
        Vue.set(state, key, data[key])
      }
      Vue.set(state, 'messages', [])
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
        subject: optional(string),
        message: optional(string),
        headers: optional(object)
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
