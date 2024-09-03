'use strict'

import { L } from '@common/common.js'
import sbp from '@sbp/sbp'
import { arrayOf, boolean, object, objectMaybeOf, objectOf, optional, string, stringMax, unionOf } from '~/frontend/model/contracts/misc/flowTyper.js'
import { LEFT_GROUP } from '~/frontend/utils/events.js'
import { Secret } from '~/shared/domains/chelonia/Secret.js'
import { findForeignKeysByContractID, findKeyIdByName } from '~/shared/domains/chelonia/utils.js'
import {
  IDENTITY_USERNAME_MAX_CHARS,
  IDENTITY_EMAIL_MAX_CHARS,
  IDENTITY_BIO_MAX_CHARS,
  MAX_HASH_LEN,
  MAX_URL_LEN
} from './shared/constants.js'
import identityGetters from './shared/getters/identity.js'
import { has, merge } from './shared/giLodash.js'
import {
  allowedUsernameCharacters,
  noConsecutiveHyphensOrUnderscores,
  noLeadingOrTrailingHyphen,
  noLeadingOrTrailingUnderscore,
  noUppercase
} from './shared/validators.js'

const attributesType = objectMaybeOf({
  username: stringMax(IDENTITY_USERNAME_MAX_CHARS, 'username'),
  displayName: optional(stringMax(IDENTITY_USERNAME_MAX_CHARS, 'displayName')), // same char-limit as the username.
  email: optional(stringMax(IDENTITY_EMAIL_MAX_CHARS, 'email')), // https://github.com/okTurtles/group-income/issues/2192
  bio: optional(stringMax(IDENTITY_BIO_MAX_CHARS, 'bio')),
  picture: unionOf(stringMax(MAX_URL_LEN), objectOf({
    manifestCid: stringMax(MAX_HASH_LEN, 'manifestCid'),
    downloadParams: optional(object)
  }))
})

const validateUsername = (username: string) => {
  if (!username) {
    throw new TypeError('A username is required')
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
    if (await sbp('namespace/lookupCached', username) !== contractID) {
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
    ...identityGetters
  },
  actions: {
    'gi.contracts/identity': {
      validate: (data) => {
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
          state[key] = initialState[key]
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
          state.attributes[key] = data[key]
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
          delete state.attributes[attribute]
        }
      }
    },
    'gi.contracts/identity/updateSettings': {
      validate: object,
      process ({ data }, { state }) {
        for (const key in data) {
          state.settings[key] = data[key]
        }
      }
    },
    'gi.contracts/identity/createDirectMessage': {
      validate: (data) => {
        objectOf({
          contractID: stringMax(MAX_HASH_LEN, 'contractID') // NOTE: chatroom contract id
        })(data)
      },
      process ({ data }, { state }) {
        const { contractID } = data
        state.chatRooms[contractID] = {
          visible: true // NOTE: this attr is used to hide/show direct message
        }
      },
      sideEffect ({ data }) {
        sbp('chelonia/contract/retain', data.contractID).catch((e) => {
          console.error('[gi.contracts/identity/createDirectMessage/sideEffect] Error calling retain', e)
        })
      }
    },
    'gi.contracts/identity/joinDirectMessage': {
      validate: objectOf({
        contractID: stringMax(MAX_HASH_LEN, 'contractID')
      }),
      process ({ data }, { state }) {
        // NOTE: this method is always created by another
        const { contractID } = data
        if (state.chatRooms[contractID]) {
          throw new TypeError(L('Already joined direct message.'))
        }

        state.chatRooms[contractID] = {
          visible: true
        }
      },
      sideEffect ({ data }, { state }) {
        if (state.chatRooms[data.contractID].visible) {
          sbp('chelonia/contract/retain', data.contractID).catch((e) => {
            console.error('[gi.contracts/identity/createDirectMessage/sideEffect] Error calling retain', e)
          })
        }
      }
    },
    'gi.contracts/identity/joinGroup': {
      validate: objectMaybeOf({
        groupContractID: stringMax(MAX_HASH_LEN, 'groupContractID'),
        inviteSecret: string,
        creatorID: optional(boolean)
      }),
      async process ({ hash, data }, { state }) {
        const { groupContractID, inviteSecret } = data
        if (has(state.groups, groupContractID)) {
          throw new Error(`Cannot join already joined group ${groupContractID}`)
        }

        const inviteSecretId = await sbp('chelonia/crypto/keyId', new Secret(inviteSecret))

        state.groups[groupContractID] = { hash, inviteSecretId }
      },
      async sideEffect ({ hash, data, contractID }, { state }) {
        const { groupContractID, inviteSecret } = data

        await sbp('chelonia/storeSecretKeys', new Secret([{
          key: inviteSecret, transient: true
        }]))

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

          const inviteSecretId = sbp('chelonia/crypto/keyId', new Secret(inviteSecret))

          // If the hash doesn't match (could happen after re-joining), return
          if (state.groups[groupContractID].hash !== hash) {
            return
          }

          return inviteSecretId
        }).then(async (inviteSecretId) => {
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
            innerSigningKeyId: await sbp('chelonia/contract/currentKeyIdByName', state, 'csk'),
            encryptionKeyId: await sbp('chelonia/contract/currentKeyIdByName', state, 'cek')
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
        groupContractID: stringMax(MAX_HASH_LEN, 'groupContractID'),
        reference: string
      }),
      process ({ data }, { state }) {
        const { groupContractID } = data

        if (!has(state.groups, groupContractID)) {
          throw new Error(`Cannot leave group which hasn't been joined ${groupContractID}`)
        }

        if (state.groups[groupContractID].hash !== data.reference) {
          throw new Error(`Cannot leave group ${groupContractID} because the reference hash does not match the latest`)
        }

        delete state.groups[groupContractID]
      },
      sideEffect ({ data, contractID }) {
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

          // Remove last logged in information
          if (sbp('state/vuex/state').lastLoggedIn?.[contractID]) {
            delete sbp('state/vuex/state').lastLoggedIn[contractID]
          }

          sbp('gi.contracts/identity/revokeGroupKeyAndRotateOurPEK', contractID, state, data.groupContractID)
          sbp('okTurtles.events/emit', LEFT_GROUP, { identityContractID: contractID, groupContractID: data.groupContractID })
        }).catch(e => {
          console.error(`[gi.contracts/identity/leaveGroup/sideEffect] Error leaving group ${data.groupContractID}`, e)
        })
      }
    },
    'gi.contracts/identity/setDirectMessageVisibility': {
      validate: (data, { state }) => {
        objectOf({
          contractID: stringMax(MAX_HASH_LEN, 'contractID'),
          visible: boolean
        })(data)
        if (!state.chatRooms[data.contractID]) {
          throw new TypeError(L('Not existing direct message.'))
        }
      },
      process ({ data }, { state }) {
        state.chatRooms[data.contractID]['visible'] = data.visible
      }
    },
    'gi.contracts/identity/saveFileDeleteToken': {
      validate: objectOf({
        tokensByManifestCid: arrayOf(objectOf({
          manifestCid: stringMax(MAX_HASH_LEN, 'manifestCid'),
          token: string
        }))
      }),
      process ({ data }, { state }) {
        for (const { manifestCid, token } of data.tokensByManifestCid) {
          state.fileDeleteTokens[manifestCid] = token
        }
      }
    },
    'gi.contracts/identity/removeFileDeleteToken': {
      validate: objectOf({
        manifestCids: arrayOf(string)
      }),
      process ({ data }, { state }) {
        for (const manifestCid of data.manifestCids) {
          delete state.fileDeleteTokens[manifestCid]
        }
      }
    }
  },
  methods: {
    'gi.contracts/identity/revokeGroupKeyAndRotateOurPEK': (identityContractID, state, groupContractID) => {
      if (!state._volatile) state['_volatile'] = Object.create(null)
      if (!state._volatile.pendingKeyRevocations) state._volatile['pendingKeyRevocations'] = Object.create(null)

      const CSKid = findKeyIdByName(state, 'csk')
      const CEKid = findKeyIdByName(state, 'cek')
      const PEKid = findKeyIdByName(state, 'pek')

      state._volatile.pendingKeyRevocations[PEKid] = true

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
