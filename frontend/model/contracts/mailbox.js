/* globals fetchServerTime */

'use strict'

import sbp from '@sbp/sbp'
import { Vue, L } from '@common/common.js'
import { merge } from './shared/giLodash.js'
import { leaveChatRoom } from './shared/functions.js'
import { object, objectOf, string, optional } from '~/frontend/model/contracts/misc/flowTyper.js'
import { logExceptNavigationDuplicated } from '~/frontend/views/utils/misc.js'

sbp('chelonia/defineContract', {
  name: 'gi.contracts/mailbox',
  metadata: {
    validate: objectOf({
      createdDate: string, // action created date
      username: optional(string), // action creator
      identityContractID: optional(string) // action creator identityContractID
    }),
    async create () {
      const createdDate = await fetchServerTime()
      // NOTE: mailbox contract is created before user logs in and also registers either.
      // so username and identityContractID could be undefined at this time
      if (!sbp('state/vuex/state').loggedIn) {
        return { createdDate }
      }
      const { username, identityContractID } = sbp('state/vuex/state').loggedIn
      return {
        createdDate,
        username,
        identityContractID
      }
    }
  },
  actions: {
    'gi.contracts/mailbox': {
      validate: objectOf({
        username: string
      }),
      process ({ data }, { state }) {
        const initialState = merge({
          attributes: {
            creator: data.username,
            autoJoinAllowance: true
          },
          users: {}
        }, data)
        for (const key in initialState) {
          Vue.set(state, key, initialState[key])
        }
      }
    },
    'gi.contracts/mailbox/setAttributes': {
      validate: (data, { state, meta }) => {
        if (state.attributes.creator !== meta.username) {
          throw new TypeError(L('Only the mailbox creator can set attributes.'))
        }
        object(data)
      },
      process ({ meta, data }, { state }) {
        for (const key in data) {
          Vue.set(state.attributes, key, data[key])
        }
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
      async sideEffect ({ contractID, data }) {
        await sbp('chelonia/contract/sync', data.contractID)

        if (!sbp('chelonia/contract/isSyncing', contractID)) {
          await sbp('controller/router')
            .push({ name: 'GroupChatConversation', params: { chatRoomId: data.contractID } })
            .catch(logExceptNavigationDuplicated)
        }
      }
    },
    'gi.contracts/mailbox/joinDirectMessage': {
      validate: objectOf({
        username: string,
        contractID: optional(string)
      }),
      process ({ meta, data }, { state }) {
        if (state.attributes.creator === data.username) {
          if (state.users[meta.username]) {
            throw new TypeError(L('Already existing direct message channel.'))
          }
        } else if (state.attributes.creator === meta.username) {
          if (!state.users[data.username] || state.users[data.username].joinedDate) {
            throw new TypeError(L('Never created or already joined direct message channel.'))
          }
        } else {
          throw new TypeError(L('Incorrect mailbox creator to join direct message channel.'))
        }
        const joinedDate = state.attributes.autoJoinAllowance ? meta.createdDate : null
        if (state.attributes.creator === data.username) {
          Vue.set(state.users, meta.username, {
            contractID: data.contractID,
            creator: meta.username,
            hidden: false,
            joinedDate
          })
        } else {
          Vue.set(state.users[data.username], 'joinedDate', joinedDate)
        }
      },
      async sideEffect ({ contractID, meta, data }, { state }) {
        let chatRoomId
        if (state.attributes.creator === meta.username) {
          chatRoomId = state.users[data.username].contractID
        } else if (state.attributes.autoJoinAllowance) {
          chatRoomId = data.contractID
        }
        if (chatRoomId) {
          await sbp('chelonia/contract/sync', chatRoomId)
        }
        if (state.attributes.creator === meta.username && !sbp('chelonia/contract/isSyncing', contractID)) {
          await sbp('controller/router')
            .push({ name: 'GroupChatConversation', params: { chatRoomId } })
            .catch(logExceptNavigationDuplicated)
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
        } else if (!state.users[data.username]?.joinedDate) {
          throw new TypeError(L('Not joined or already left direct message channel.'))
        }
      },
      process ({ data }, { state }) {
        Vue.set(state.users[data.username], 'joinedDate', null)
      },
      sideEffect ({ contractID, data }, { state }) {
        leaveChatRoom({ contractID: state.users[data.username].contractID })
      }
    }
  }
})
