/* globals fetchServerTime */

'use strict'

import sbp from '@sbp/sbp'
import { Vue, L } from '@common/common.js'
import { merge } from './shared/giLodash.js'
import { leaveChatRoom, syncChatRoomContract } from './shared/functions.js'
import { object, objectOf, objectMaybeOf, string, boolean, unionOf, literalOf, optional } from '~/frontend/model/contracts/misc/flowTyper.js'
import { CHATROOM_PRIVACY_LEVEL } from './shared/constants.js'
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
  getters: {
    currentMailboxState (state) {
      return state
    },
    ourDirectMessages (state, getters) {
      return getters.currentMailboxState.chatRooms || {}
    }
  },
  actions: {
    'gi.contracts/mailbox': {
      validate: objectMaybeOf({
        username: string
      }),
      process ({ data }, { state }) {
        const initialState = merge({
          attributes: {
            creator: data.username,
            // NOTE: autoJoinAllownace is used to block the other's requests to create DMs
            // and to avoid automatic syncing the chatroom contracts
            autoJoinAllowance: true
          },
          chatRooms: {}
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
      validate: (data, { state, getters, meta }) => {
        objectOf({
          privacyLevel: unionOf(...Object.values(CHATROOM_PRIVACY_LEVEL).map(v => literalOf(v))),
          contractID: string
        })(data)
        if (state.attributes.creator !== meta.username) {
          throw new TypeError(L('Only the mailbox creator can create direct message channel.'))
        }
      },
      process ({ meta, data }, { state }) {
        Vue.set(state.chatRooms, data.contractID, {
          privacyLevel: data.privacyLevel,
          hidden: false // NOTE: this attr is used to hide/show direct message
        })
      },
      async sideEffect ({ contractID, data }) {
        await syncChatRoomContract(data.contractID)

        if (!sbp('chelonia/contract/isSyncing', contractID)) {
          await sbp('controller/router')
            .push({ name: 'GroupChatConversation', params: { chatRoomId: data.contractID } })
            .catch(logExceptNavigationDuplicated)
        }
      }
    },
    'gi.contracts/mailbox/joinDirectMessage': {
      validate: objectOf({
        privacyLevel: unionOf(...Object.values(CHATROOM_PRIVACY_LEVEL).map(v => literalOf(v))),
        contractID: string
      }),
      process ({ meta, data }, { state, getters }) {
        // NOTE: this method is always created by another
        if (getters.ourDirectMessages[data.contractID]) {
          throw new TypeError(L('Already joined direct message.'))
        }

        Vue.set(state.chatRooms, data.contractID, {
          privacyLevel: data.privacyLevel,
          hidden: !state.attributes.autoJoinAllowance
        })
      },
      async sideEffect ({ contractID, meta, data }, { state, getters }) {
        if (state.attributes.autoJoinAllowance) {
          await syncChatRoomContract(data.contractID)
        }
      }
    },
    'gi.contracts/mailbox/setDirectMessageVisibility': {
      validate: (data, { state, getters, meta }) => {
        objectOf({
          contractID: string,
          hidden: boolean
        })(data)
        if (state.attributes.creator !== meta.username) {
          throw new TypeError(L('Only the mailbox creator can hide direct message channel.'))
        } else if (!getters.ourDirectMessages[data.contractID]) {
          throw new TypeError(L('Not existing direct message.'))
        }
      },
      process ({ data }, { state, getters }) {
        Vue.set(state.chatRooms[data.contractID], 'hidden', data.hidden)
      },
      sideEffect ({ data }) {
        const { contractID, hidden } = data
        hidden ? leaveChatRoom({ contractID }) : sbp('chelonia/contract/sync', contractID)
      }
    }
  }
})
