'use strict'

import sbp from '@sbp/sbp'
import { Vue, L } from '@common/common.js'
import { has, merge } from './shared/giLodash.js'
import { objectOf, objectMaybeOf, arrayOf, string, object, boolean, optional, unionOf } from '~/frontend/model/contracts/misc/flowTyper.js'
import {
  allowedUsernameCharacters,
  noConsecutiveHyphensOrUnderscores,
  noLeadingOrTrailingHyphen,
  noLeadingOrTrailingUnderscore,
  noUppercase
} from './shared/validators.js'

import { IDENTITY_USERNAME_MAX_CHARS } from './shared/constants.js'

const attributesType = objectMaybeOf({
  username: string,
  email: string,
  picture: unionOf(string, objectOf({
    manifestCid: string,
    downloadParams: optional(object)
  }))
})

const validateUsername = (username: string) => {
  if (!username) {
    throw new TypeError('A username is required')
  }
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
}

const checkUsernameConsistency = async (contractID: string, username: string) => {
  // Lookup and save the username so that we can verify that it matches
  const lookupResult = await sbp('namespace/lookup', username, { skipCache: true })
  if (lookupResult === contractID) return

  console.error(`Mismatched username. The lookup result was ${lookupResult} instead of ${contractID}`)

  // If there was a mismatch, wait until the contract is finished processing
  // (because the username could have been updated), and if the situation
  // persists, warn the user
  sbp('chelonia/queueInvocation', contractID, () => {
    const rootState = sbp('state/vuex/state')
    if (!has(rootState, contractID)) return

    const username = rootState[contractID].attributes.username
    if (sbp('namespace/lookupCached', username) !== contractID) {
      sbp('gi.notifications/emit', 'WARNING', {
        contractID,
        message: L('Unable to confirm that the username {username} belongs to this identity contract', { username })
      })
    }
  })
}

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
          attributes: attributesType
        })(data)
        const { username } = data.attributes
        if (!username) {
          throw new TypeError('A username is required')
        }
        validateUsername(username)
      },
      process ({ data }, { state }) {
        const initialState = merge({
          settings: {},
          attributes: {},
          chatRooms: {},
          groups: {},
          fileDeleteTokens: {}
        }, data)
        for (const key in initialState) {
          Vue.set(state, key, initialState[key])
        }
      },
      async sideEffect ({ contractID, data }) {
        await checkUsernameConsistency(contractID, data.attributes.username)
      }
    },
    'gi.contracts/identity/setAttributes': {
      validate: (data) => {
        attributesType(data)
        if (has(data, 'username')) {
          validateUsername(data.username)
        }
      },
      process ({ data }, { state }) {
        for (const key in data) {
          Vue.set(state.attributes, key, data[key])
        }
      },
      async sideEffect ({ contractID, data }) {
        if (has(data, 'username')) {
          await checkUsernameConsistency(contractID, data.username)
        }
      }
    },
    'gi.contracts/identity/deleteAttributes': {
      validate: (data) => {
        arrayOf(string)(data)
        if (data.includes('username')) {
          throw new Error('Username can\'t be deleted')
        }
      },
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
          contractID: string // NOTE: chatroom contract id
        })(data)
      },
      process ({ data }, { state }) {
        const { contractID } = data
        Vue.set(state.chatRooms, contractID, {
          visible: true // NOTE: this attr is used to hide/show direct message
        })
      },
      async sideEffect ({ contractID, data }) {
        await sbp('chelonia/contract/sync', data.contractID)
      }
    },
    'gi.contracts/identity/joinDirectMessage': {
      validate: objectOf({
        contractID: string
      }),
      process ({ data }, { state, getters }) {
        // NOTE: this method is always created by another
        const { contractID } = data
        if (getters.ourDirectMessages[contractID]) {
          throw new TypeError(L('Already joined direct message.'))
        }

        Vue.set(state.chatRooms, contractID, {
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
        creatorID: optional(boolean)
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

          return inviteSecretId
        }).then((inviteSecretId) => {
          // Calling 'gi.actions/group/join' here _after_ queueInvoication
          // and not inside of it.
          // This is because 'gi.actions/group/join' might (depending on
          // where we are at in the process of joining a group) call
          // 'chelonia/out/keyRequest'. If this happens, it will block
          // on the group contract queue (as normal and expected), but it
          // will **ALSO** block on the current identity contract, which
          // is already blocked by queueInvocation. This would result in
          // a deadlock.
          if (!inviteSecretId) return

          sbp('gi.actions/group/join', {
            originatingContractID: contractID,
            originatingContractName: 'gi.contracts/identity',
            contractID: data.groupContractID,
            contractName: 'gi.contracts/group',
            reference: hash,
            signingKeyId: inviteSecretId,
            innerSigningKeyId: sbp('chelonia/contract/currentKeyIdByName', state, 'csk'),
            encryptionKeyId: sbp('chelonia/contract/currentKeyIdByName', state, 'cek')
          }).catch(e => {
            console.warn(`[gi.contracts/identity/joinGroup/sideEffect] Error sending gi.actions/group/join action for group ${data.groupContractID}`, e)
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
        sbp('chelonia/queueInvocation', contractID, () => {
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
            sbp('gi.actions/group/removeOurselves', {
              contractID: groupContractID
            }).catch(e => {
              console.warn(`[gi.contracts/identity/leaveGroup/sideEffect] Error removing ourselves from group contract ${data.groupContractID}`, e)
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
    },
    'gi.contracts/identity/saveFileDeleteToken': {
      validate: objectOf({
        tokensByManifestCid: arrayOf(objectOf({
          manifestCid: string,
          token: string
        }))
      }),
      process ({ data }, { state, getters }) {
        for (const { manifestCid, token } of data.tokensByManifestCid) {
          Vue.set(state.fileDeleteTokens, manifestCid, token)
        }
      }
    },
    'gi.contracts/identity/removeFileDeleteToken': {
      validate: objectOf({
        manifestCids: arrayOf(string)
      }),
      process ({ data }, { state, getters }) {
        for (const manifestCid of data.manifestCids) {
          Vue.delete(state.fileDeleteTokens, manifestCid)
        }
      }
    }
  }
})
