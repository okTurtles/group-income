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
import { findKeyIdByName, findForeignKeysByContractID } from '~/shared/domains/chelonia/utils.js'

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
  sbp('chelonia/queueInvocation', contractID, async () => {
    const state = await sbp('chelonia/contract/state', contractID)
    if (!state) return

    const username = state[contractID].attributes.username
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
      sideEffect ({ contractID, data }) {
        sbp('chelonia/contract/retain', data.contractID).catch((e) => {
          console.error('[gi.contracts/identity/createDirectMessage/sideEffect] Error calling retain', e)
        })
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
      sideEffect ({ data }, { getters }) {
        if (getters.ourDirectMessages[data.contractID].visible) {
          sbp('chelonia/contract/retain', data.contractID).catch((e) => {
            console.error('[gi.contracts/identity/createDirectMessage/sideEffect] Error calling retain', e)
          })
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

        sbp('chelonia/queueInvocation', contractID, async () => {
          const state = await sbp('chelonia/contract/state', contractID)

          // If we've logged out, return
          if (!state || contractID !== sbp('state/vuex/state').loggedIn.identityContractID) {
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

          sbp('chelonia/contract/retain', data.groupContractID).catch((e) => {
            console.error('[gi.contracts/identity/joinGroup/sideEffect] Error calling retain', e)
          })

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
        sbp('chelonia/queueInvocation', contractID, async () => {
          const state = await sbp('chelonia/contract/state', contractID)

          // If we've logged out, return
          if (!state || contractID !== sbp('state/vuex/state').loggedIn.identityContractID) {
            return
          }

          const { groupContractID } = data

          // If we've re-joined since, return
          if (has(state.groups, groupContractID)) {
            return
          }

          sbp('gi.actions/group/removeOurselves', {
            contractID: groupContractID
          }).catch(e => {
            if (e?.name === 'GIErrorUIRuntimeError' && e.cause?.name === 'GIGroupNotJoinedError') return
            console.warn(`[gi.contracts/identity/leaveGroup/sideEffect] Error removing ourselves from group contract ${data.groupContractID}`, e)
          })

          sbp('chelonia/contract/release', data.groupContractID).catch((e) => {
            console.error('[gi.contracts/identity/leaveGroup/sideEffect] Error calling release', e)
          })

          // grab the groupID of any group that we're a part of
          if (!sbp('state/vuex/state').currentGroupId || sbp('state/vuex/state').currentGroupId === data.groupContractID) {
            const groupIdToSwitch = Object.keys(state.groups)
              .filter(cID =>
                cID !== data.groupContractID
              ).sort(cID =>
              // prefer successfully joined groups
                sbp('state/vuex/state')[cID]?.profiles?.[contractID] ? -1 : 1
              )[0] || null
            sbp('state/vuex/commit', 'setCurrentChatRoomId', {})
            sbp('state/vuex/commit', 'setCurrentGroupId', groupIdToSwitch)
          }

          // Remove last logged in information
          Vue.delete(sbp('state/vuex/state').lastLoggedIn, contractID)

          // this looks crazy, but doing this was necessary to fix a race condition in the
          // group-member-removal Cypress tests where due to the ordering of asynchronous events
          // we were getting the same latestHash upon re-logging in for test "user2 rejoins groupA".
          // We add it to the same queue as '/release' above gets run on so that it is run after
          // contractID is removed. See also comments in 'gi.actions/identity/login'.
          try {
            const router = sbp('controller/router')
            const switchFrom = router.currentRoute.path
            const switchTo = sbp('state/vuex/state').currentGroupId ? '/dashboard' : '/'
            if (switchFrom !== '/join' && switchFrom !== switchTo) {
              router.push({ path: switchTo }).catch((e) => console.error('Error switching groups', e))
            }
          } catch (e) {
            console.error(`[gi.contracts/identity/leaveGroup/sideEffect]: ${e.name} thrown updating routes:`, e)
          }

          sbp('gi.contracts/identity/revokeGroupKeyAndRotateOurPEK', contractID, state, data.groupContractID)
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
  },
  methods: {
    'gi.contracts/identity/revokeGroupKeyAndRotateOurPEK': (identityContractID, state, groupContractID) => {
      if (!state._volatile) Vue.set(state, '_volatile', Object.create(null))
      if (!state._volatile.pendingKeyRevocations) Vue.set(state._volatile, 'pendingKeyRevocations', Object.create(null))

      const CSKid = findKeyIdByName(state, 'csk')
      const CEKid = findKeyIdByName(state, 'cek')
      const PEKid = findKeyIdByName(state, 'pek')

      Vue.set(state._volatile.pendingKeyRevocations, PEKid, true)

      const groupCSKids = findForeignKeysByContractID(state, groupContractID)

      if (groupCSKids?.length) {
        if (!CEKid) {
          throw new Error('Identity CEK not found')
        }

        sbp('chelonia/queueInvocation', identityContractID, ['chelonia/out/keyDel', {
          contractID: identityContractID,
          contractName: 'gi.contracts/identity',
          data: groupCSKids,
          signingKeyId: CSKid
        }])
          .catch(e => {
            console.warn(`revokeGroupKeyAndRotateOurPEK: ${e.name} thrown during keyDel to ${identityContractID}:`, e)
          })
      }

      sbp('chelonia/queueInvocation', identityContractID, ['chelonia/contract/disconnect', identityContractID, groupContractID]).catch(e => {
        console.warn(`revokeGroupKeyAndRotateOurPEK: ${e.name} thrown during queueEvent to ${identityContractID}:`, e)
      })

      sbp('chelonia/queueInvocation', identityContractID, ['gi.actions/out/rotateKeys', identityContractID, 'gi.contracts/identity', 'pending', 'gi.actions/identity/shareNewPEK']).catch(e => {
        console.warn(`revokeGroupKeyAndRotateOurPEK: ${e.name} thrown during queueEvent to ${identityContractID}:`, e)
      })
    }
  }
})
