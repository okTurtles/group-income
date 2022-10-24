'use strict'

import sbp from '@sbp/sbp'
import { Vue, L } from '@common/common.js'
import { merge } from './shared/giLodash.js'
import { objectOf, string, boolean, object } from '~/frontend/model/contracts/misc/flowTyper.js'

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
      process ({ meta, data }, { state }) {
        const initialState = merge({
          attributes: {
            creator: meta.username,
            autoJoinAllowance: true
          },
          users: {}
        }, data)
        for (const key in initialState) {
          Vue.set(state, key, initialState[key])
        }
      }
    },
    'gi.contracts/mailbox/setAutoJoinAllowance': {
      validate: (data, { state, meta }) => {
        objectOf({ allownace: boolean })(data)
        if (state.attributes.creator !== meta.username) {
          throw new TypeError(L('Only the mailbox creator can set attributes.'))
        } else if (state.attributes === data.allownace) {
          throw new TypeError(L('Same attribute is already set.'))
        }
      },
      process ({ meta, data }, { state }) {
        Vue.set(state.attributes, 'autoJoinAllowance', data.allownace)
      }
    },
    'gi.contracts/mailbox/createDirectMessage': {
      validate: (data, { state, meta }) => {
        objectOf({
          username: string,
          contractID: string
        })(data)
        if (state.attributes.creator !== meta.username) {
          throw new TypeError(L('Only the mailbox creator can create direct message channel.'))
        } else if (state.users[data.username]) {
          throw new TypeError(L('Already existing direct message channel.'))
        }
      },
      process ({ meta, data }, { state }) {
        Vue.set(state.users, data.username, {
          contractID: data.contractID,
          creator: meta.username,
          hidden: false,
          joinedDate: meta.createdDate
        })
      },
      sideEffect ({ data }) {
        sbp('chelonia/contract/sync', data.contractID)
      }
    },
    'gi.contracts/mailbox/joinDirectMessage': {
      validate: (data, { state, meta }) => {
        objectOf({
          username: string,
          contractID: string
        })(data)
        if (state.attributes.creator !== data.username) {
          throw new TypeError(L('Incorrect mailbox creator to join direct message channel.'))
        } else if (state.users[meta.username]) {
          throw new TypeError(L('Already existing direct message channel.'))
        }
      },
      process ({ meta, data }, { state }) {
        const joinedDate = state.attributes.autoJoinAllowance ? meta.createdDate : null
        Vue.set(state.users, meta.username, {
          contractID: data.contractID,
          creator: meta.username,
          hidden: false,
          joinedDate
        })
      },
      async sideEffect ({ data }, { state }) {
        if (state.attributes.autoJoinAllowance) {
          await sbp('chelonia/contract/sync', data.contractID)
        }
      }
    },
    'gi.contracts/mailbox/leaveDirectMessage': {
      validate: (data, { state, meta }) => {
        objectOf({
          username: string
        })(data)
        if (state.attributes.creator !== meta.username) {
          throw new TypeError(L('Only the mailbox creator can leave direct message channel.'))
        } else if (!state.users[meta.username].joinedDate) {
          throw new TypeError(L('Not joined or already left direct message channel.'))
        }
      },
      process ({ data }, { state }) {
        Vue.set(state.users[data.username], 'joinedDate', null)
      },
      sideEffect ({ data }) {
        sbp('chelonia/contract/remove', data.contractID)
      }
    }
  }
})
