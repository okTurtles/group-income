'use strict'

import sbp from '@sbp/sbp'
import { Vue, L } from '@common/common.js'
import { merge } from './shared/giLodash.js'
import { objectOf, objectMaybeOf, arrayOf, string, object, boolean } from '~/frontend/model/contracts/misc/flowTyper.js'
import {
  allowedUsernameCharacters,
  noConsecutiveHyphensOrUnderscores,
  noLeadingOrTrailingHyphen,
  noLeadingOrTrailingUnderscore,
  noUppercase
} from './shared/validators.js'
import { leaveChatRoom } from './shared/functions.js'
import { logExceptNavigationDuplicated } from '~/frontend/views/utils/misc.js'

import { IDENTITY_USERNAME_MAX_CHARS } from './shared/constants.js'

sbp('chelonia/defineContract', {
  name: 'gi.contracts/identity',
  getters: {
    currentIdentityState (state) {
      return state
    },
    loginState (state, getters) {
      return getters.currentIdentityState.loginState
    },
    ourDirectMessages (state, getters) {
      return getters.currentIdentityState.chatRooms || {}
    }
  },
  actions: {
    'gi.contracts/identity': {
      validate: (data, { state }) => {
        objectMaybeOf({
          attributes: objectMaybeOf({
            username: string,
            email: string,
            picture: string
          })
        })(data)
        const { username } = data.attributes
        if (username.length > IDENTITY_USERNAME_MAX_CHARS) {
          throw new TypeError(`A username cannot exceed ${IDENTITY_USERNAME_MAX_CHARS} characters.`)
        }
        if (!allowedUsernameCharacters(username)) {
          throw new TypeError('A username cannot contain disallowed characters.')
        }
        if (!noConsecutiveHyphensOrUnderscores(username)) {
          throw new TypeError('A username cannot contain two consecutive hyphens or underscores.')
        }
        if (!noLeadingOrTrailingHyphen(username)) {
          throw new TypeError('A username cannot start or end with a hyphen.')
        }
        if (!noLeadingOrTrailingUnderscore(username)) {
          throw new TypeError('A username cannot start or end with an underscore.')
        }
        if (!noUppercase(username)) {
          throw new TypeError('A username cannot contain uppercase letters.')
        }
      },
      process ({ data }, { state }) {
        const initialState = merge({
          settings: {},
          attributes: {
            allowDMInvite: true
          },
          chatRooms: {}
        }, data)
        for (const key in initialState) {
          Vue.set(state, key, initialState[key])
        }
      }
    },
    'gi.contracts/identity/setAttributes': {
      validate: object,
      process ({ data }, { state }) {
        for (const key in data) {
          Vue.set(state.attributes, key, data[key])
        }
      }
    },
    'gi.contracts/identity/deleteAttributes': {
      validate: arrayOf(string),
      process ({ data }, { state }) {
        for (const attribute of data) {
          Vue.delete(state.attributes, attribute)
        }
      }
    },
    'gi.contracts/identity/updateSettings': {
      validate: object,
      process ({ data }, { state }) {
        for (const key in data) {
          Vue.set(state.settings, key, data[key])
        }
      }
    },
    'gi.contracts/identity/setLoginState': {
      validate: objectOf({
        groupIds: arrayOf(string)
      }),
      process ({ data }, { state }) {
        Vue.set(state, 'loginState', data)
      },
      sideEffect ({ contractID }) {
        // it only makes sense to call updateLoginStateUponLogin for ourselves
        if (contractID === sbp('state/vuex/getters').ourIdentityContractId) {
          // makes sure that updateLoginStateUponLogin gets run after the entire identity
          // state has been synced, this way we don't end up joining groups we've left, etc.
          sbp('chelonia/queueInvocation', contractID, ['gi.actions/identity/updateLoginStateUponLogin'])
            .catch((e) => {
              sbp('gi.notifications/emit', 'ERROR', {
                message: L("Failed to join groups we're part of on another device. Not catastrophic, but could lead to problems. {errName}: '{errMsg}'", {
                  errName: e.name,
                  errMsg: e.message || '?'
                })
              })
            })
        }
      }
    },
    'gi.contracts/identity/createDirectMessage': {
      validate: (data, { state, getters }) => {
        objectOf({
          groupContractID: string,
          contractID: string
        })(data)
      },
      process ({ data }, { state }) {
        Vue.set(state.chatRooms, data.contractID, {
          groupContractID: data.groupContractID,
          visible: true // NOTE: this attr is used to hide/show direct message
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
    'gi.contracts/identity/joinDirectMessage': {
      validate: objectOf({
        groupContractID: string,
        contractID: string
      }),
      process ({ data }, { state, getters }) {
        // NOTE: this method is always created by another
        if (getters.ourDirectMessages[data.contractID]) {
          throw new TypeError(L('Already joined direct message.'))
        }

        Vue.set(state.chatRooms, data.contractID, {
          groupContractID: data.groupContractID,
          visible: state.attributes.allowDMInvite
        })
      },
      async sideEffect ({ data }, { getters }) {
        if (getters.ourDirectMessages[data.contractID].visible) {
          await sbp('chelonia/contract/sync', data.contractID)
        }
      }
    },
    'gi.contracts/identity/setDirectMessageVisibility': {
      validate: (data, { state, getters }) => {
        objectOf({
          contractID: string,
          visible: boolean
        })(data)
        if (!getters.ourDirectMessages[data.contractID]) {
          throw new TypeError(L('Not existing direct message.'))
        }
      },
      process ({ data }, { state, getters }) {
        Vue.set(state.chatRooms[data.contractID], 'visible', data.visible)
      },
      sideEffect ({ data }) {
        const { contractID, visible } = data
        visible ? sbp('chelonia/contract/sync', contractID) : leaveChatRoom({ contractID })
      }
    }
  }
})
