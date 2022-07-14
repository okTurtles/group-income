'use strict'

import sbp from '@sbp/sbp'
import { Vue } from '@common/common.js'
import { mailType } from './shared/types.js'
import { objectOf, string, object, optional } from '~/frontend/model/contracts/misc/flowTyper.js'

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
        messageType: mailType,
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
