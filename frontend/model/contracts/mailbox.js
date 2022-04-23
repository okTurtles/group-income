'use strict'

import sbp from '@sbp/sbp'
import Vue from 'vue'
import { objectOf, string, object, unionOf, literalOf, optional } from '~/frontend/utils/flowTyper.js'

export const TYPE_MESSAGE = 'message'
export const TYPE_FRIEND_REQ = 'friend-request'

export const messageType: any = unionOf(...[TYPE_MESSAGE, TYPE_FRIEND_REQ].map(k => literalOf(k)))

sbp('chelonia/defineContract', {
  name: 'gi.contracts/mailbox',
  metadata: {
    // TODO: why is this missing the from username..?
    validate: objectOf({
      createdDate: string
    }),
    create () {
      return {
        createdDate: new Date().toISOString()
      }
    }
  },
  state (contractID) {
    return sbp('state/vuex/state')[contractID]
  },
  actions: {
    'gi.contracts/mailbox': {
      validate: object, // TODO: define this
      process ({ data }, { state }) {
        for (const key in data) {
          Vue.set(state, key, data[key])
        }
        Vue.set(state, 'messages', [])
      }
    },
    'gi.contracts/mailbox/postMessage': {
      validate: objectOf({
        messageType: messageType,
        from: string,
        subject: optional(string),
        message: optional(string),
        headers: optional(object)
      }),
      process (message, { state }) {
        state.messages.push(message)
      }
    },
    'gi.contracts/mailbox/authorizeSender': {
      validate: objectOf({
        sender: string
      }),
      process ({ data }, { state }) {
        // TODO: replace this via OP_KEY_*?
        throw new Error('unimplemented!')
      }
    }
  }
})
