'use strict'

import sbp from '@sbp/sbp'
import { Vue, L } from '@common/common.js'
import { has, merge } from './shared/giLodash.js'
import { objectOf, objectMaybeOf, arrayOf, string, object, boolean, optional } from '~/frontend/model/contracts/misc/flowTyper.js'
import {
  allowedUsernameCharacters,
  noConsecutiveHyphensOrUnderscores,
  noLeadingOrTrailingHyphen,
  noLeadingOrTrailingUnderscore,
  noUppercase
} from './shared/validators.js'

import { IDENTITY_USERNAME_MAX_CHARS, PROFILE_STATUS } from './shared/constants.js'

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
          attributes: {},
          chatRooms: {},
          groups: {}
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
    'gi.contracts/identity/createDirectMessage': {
      validate: (data, { state, getters }) => {
        objectOf({
          // NOTE: 'groupContractID' is the contract ID of the group where the direct messages is created
          //       it's optional parameter meaning the direct message could be created outside of the group
          groupContractID: optional(string),
          contractID: string // NOTE: chatroom contract id
        })(data)
      },
      process ({ data }, { state }) {
        const { groupContractID, contractID } = data
        Vue.set(state.chatRooms, contractID, {
          groupContractID,
          visible: true // NOTE: this attr is used to hide/show direct message
        })
      },
      async sideEffect ({ contractID, data }) {
        await sbp('chelonia/contract/sync', data.contractID)
      }
    },
    'gi.contracts/identity/joinDirectMessage': {
      validate: objectOf({
        groupContractID: optional(string),
        contractID: string
      }),
      process ({ data }, { state, getters }) {
        // NOTE: this method is always created by another
        const { groupContractID, contractID } = data
        if (getters.ourDirectMessages[contractID]) {
          throw new TypeError(L('Already joined direct message.'))
        }

        Vue.set(state.chatRooms, contractID, {
          groupContractID,
          visible: true
        })
      },
      async sideEffect ({ data }, { getters }) {
        if (getters.ourDirectMessages[data.contractID].visible) {
          await sbp('chelonia/contract/sync', data.contractID)
        }
      }
    },
    'gi.contracts/identity/joinGroup': {
      validate: objectMaybeOf({
        groupContractID: string,
        inviteSecret: string,
        creator: optional(boolean)
      }),
      process ({ hash, data, meta }, { state }) {
        const { groupContractID, inviteSecret } = data
        if (has(state.groups, groupContractID)) {
          throw new Error(`Cannot join already joined group ${groupContractID}`)
        }

        const inviteSecretId = sbp('chelonia/crypto/keyId', () => inviteSecret)

        Vue.set(state.groups, groupContractID, { hash, inviteSecretId })
      },
      sideEffect ({ hash, data, contractID }, { state }) {
        const { groupContractID, inviteSecret } = data

        sbp('chelonia/storeSecretKeys', () => [{
          key: inviteSecret, transient: true
        }])

        sbp('chelonia/queueInvocation', contractID, () => {
          const rootState = sbp('state/vuex/state')
          const state = rootState[contractID]

          // If we've logged out, return
          if (!state || contractID !== rootState.loggedIn.identityContractID) {
            return
          }

          // If we've left the group, return
          if (!has(state.groups, groupContractID)) {
            return
          }

          const inviteSecretId = sbp('chelonia/crypto/keyId', () => inviteSecret)

          // If the hash doesn't match (could happen after re-joining), return
          if (state.groups[groupContractID].hash !== hash) {
            return
          }

          return sbp('gi.actions/group/join', {
            originatingContractID: contractID,
            originatingContractName: 'gi.contracts/identity',
            contractID: data.groupContractID,
            contractName: 'gi.contracts/group',
            signingKeyId: inviteSecretId,
            innerSigningKeyId: sbp('chelonia/contract/currentKeyIdByName', state, 'csk'),
            encryptionKeyId: sbp('chelonia/contract/currentKeyIdByName', state, 'cek'),
            blockOriginatingContract: false
          }).catch(e => {
            console.error(`[gi.contracts/identity/joinGroup/sideEffect] Error joining group ${data.groupContractID}`, e)
          })
        }).catch(e => {
          console.error(`[gi.contracts/identity/joinGroup/sideEffect] Error at queueInvocation group ${data.groupContractID}`, e)
        })
      }
    },
    'gi.contracts/identity/leaveGroup': {
      validate: objectOf({
        groupContractID: string
      }),
      process ({ data, meta }, { state }) {
        const { groupContractID } = data

        if (!has(state.groups, groupContractID)) {
          throw new Error(`Cannot leave group which hasn't been joined ${groupContractID}`)
        }

        Vue.delete(state.groups, groupContractID)
      },
      sideEffect ({ meta, data, contractID, innerSigningContractID }, { state }) {
        sbp('chelonia/queueInvocation', contractID, async () => {
          const rootState = sbp('state/vuex/state')
          const state = rootState[contractID]

          // If we've logged out, return
          if (!state || contractID !== rootState.loggedIn.identityContractID) {
            return
          }

          const { groupContractID } = data

          // If we've re-joined since, return
          if (has(state.groups, groupContractID)) {
            return
          }

          if (has(rootState.contracts, groupContractID)) {
            await sbp('gi.actions/group/removeOurselves', {
              contractID: groupContractID,
              data: {},
              hooks: {
                preSendCheck: (_, state) => {
                  return state?.profiles?.[rootState.loggedIn.username]?.status === PROFILE_STATUS.ACTIVE
                }
              }
            })
          }

          // TODO disconnect, key rotations (PEK), etc.
        }).catch(e => {
          console.error(`[gi.contracts/identity/leaveGroup/sideEffect] Error leaving group ${data.groupContractID}`, e)
        })
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
      }
    }
  }
})
