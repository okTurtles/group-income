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
    create () {
      // NOTE: mailbox contract is created before user logs in and also registers either.
      // so username and identityContractID could be undefined at this time
      if (!sbp('state/vuex/state').loggedIn) {
        return { createdDate: new Date().toISOString() }
      }
      const { username, identityContractID } = sbp('state/vuex/state').loggedIn
      return {
        createdDate: new Date().toISOString(),
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
    },
    ourOneToOneDirectMessages (state, getters) {
      const oneToOneMessages = {}
      for (const contractID of Object.keys(getters.ourDirectMessages)) {
        const partner = getters.ourDirectMessages[contractID].partner
        if (partner) {
          oneToOneMessages[partner] = {
            ...getters.ourDirectMessages[contractID],
            contractID
          }
        }
      }
      return oneToOneMessages
    },
    ourOneToManyDirectMessages (state, getters) {
      const oneToManyMessages = {}
      for (const contractID of Object.keys(getters.ourDirectMessages)) {
        if (!getters.ourDirectMessages[contractID].partner) {
          oneToManyMessages[contractID] = getters.ourDirectMessages[contractID]
        }
      }
      return oneToManyMessages
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
            autoJoinAllowance: true // this attribute could be used to block him to be joined direct/group messages automatically by another
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
          username: string,
          contractID: string
        })(data)
        if (state.attributes.creator !== meta.username) {
          throw new TypeError(L('Only the mailbox creator can create direct message channel.'))
        } else if (getters.ourOneToOneDirectMessages[data.username]) {
          throw new TypeError(L('Already existing direct message channel.'))
        }
      },
      process ({ meta, data }, { state }) {
        Vue.set(state.chatRooms, data.contractID, {
          partner: data.username,
          hidden: false, // TODO: this hidden attribute should be there in state.js as global
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
      process ({ meta, data }, { state, getters }) {
        const me = state.attributes.creator
        if (me !== meta.username && getters.ourOneToOneDirectMessages[data.username]) {
          throw new TypeError(L('Already existing direct message channel.'))
        } else if (me === meta.username) {
          if (!getters.ourOneToOneDirectMessages[data.username] || getters.ourOneToOneDirectMessages[data.username].joinedDate) {
            throw new TypeError(L('Never created or already joined direct message channel.'))
          }
        }

        const joinedDate = !state.attributes.autoJoinAllowance && me !== meta.username ? null : meta.createdDate
        if (me !== meta.username) {
          Vue.set(state.chatRooms, data.contractID, {
            partner: data.username,
            hidden: false,
            joinedDate
          })
        } else {
          const contractID = getters.ourOneToOneDirectMessages[data.username].contractID
          Vue.set(state.chatRooms[contractID], 'joinedDate', joinedDate)
        }
      },
      async sideEffect ({ contractID, meta, data }, { state, getters }) {
        const me = state.attributes.creator
        let chatRoomId
        if (me === meta.username) {
          chatRoomId = getters.ourOneToOneDirectMessages[data.username].contractID
        } else if (state.attributes.autoJoinAllowance) {
          chatRoomId = data.contractID
        }
        if (chatRoomId) {
          await sbp('chelonia/contract/sync', chatRoomId)
        }
        if (me === meta.username && !sbp('chelonia/contract/isSyncing', contractID)) {
          await sbp('controller/router')
            .push({ name: 'GroupChatConversation', params: { chatRoomId } })
            .catch(logExceptNavigationDuplicated)
        }
      }
    },
    'gi.contracts/mailbox/leaveDirectMessage': {
      validate: (data, { state, getters, meta }) => {
        objectOf({ username: string })(data)
        if (state.attributes.creator !== meta.username) {
          throw new TypeError(L('Only the mailbox creator can leave direct message channel.'))
        } else if (!getters.ourOneToOneDirectMessages[data.username]?.joinedDate) {
          throw new TypeError(L('Not joined or already left direct message channel.'))
        }
      },
      process ({ data }, { state, getters }) {
        const contractID = getters.ourOneToOneDirectMessages[data.username].contractID
        Vue.set(state.chatRooms[contractID], 'joinedDate', null)
      },
      sideEffect ({ data }, { getters }) {
        leaveChatRoom({ contractID: getters.ourOneToOneDirectMessages[data.username].contractID })
      }
    },
    'gi.contracts/mailbox/createGroupMessage': {
      validate: (data, { state, meta }) => {
        objectOf({ contractID: string })(data)
        if (state.attributes.creator !== meta.username) {
          throw new TypeError(L('Only the mailbox creator can create group message channel.'))
        } else if (state.chatRooms[data.contractID]) {
          throw new TypeError(L('Already existing group message channel.'))
        }
      },
      process ({ meta, data }, { state }) {
        Vue.set(state.chatRooms, data.contractID, {
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
    'gi.contracts/mailbox/joinGroupMessage': {
      validate: (data, { state, getters, meta }) => {
        objectOf({ contractID: string })
        // TODO: need to validate if meta.username is part of the chatroom of contractID
      },
      process ({ meta, data }, { state }) {
        if (state.chatRooms[data.contractID]) {
          throw new TypeError(L('Already existing group message channel.'))
        }

        const joinedDate = state.attributes.autoJoinAllowance ? meta.createdDate : null
        Vue.set(state.chatRooms, data.contractID, {
          hidden: false, // TODO: this hidden attribute should be there in state.js as global
          joinedDate
        })
      },
      async sideEffect ({ data }, { state }) {
        if (state.attributes.autoJoinAllowance) {
          await sbp('chelonia/contract/sync', data.contractID)
        }
      }
    }
  }
})
