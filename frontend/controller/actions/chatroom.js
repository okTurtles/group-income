'use strict'
import sbp from '@sbp/sbp'

import { GIErrorUIRuntimeError, L } from '@common/common.js'
import { has, omit } from '@model/contracts/shared/giLodash.js'
import { GIMessage } from '~/shared/domains/chelonia/GIMessage.js'
import { findKeyIdByName } from '~/shared/domains/chelonia/utils.js'
import { encryptedOutgoingData, encryptedOutgoingDataWithRawKey } from '~/shared/domains/chelonia/encryptedData.js'
// Using relative path to crypto.js instead of ~-path to workaround some esbuild bug
import { CURVE25519XSALSA20POLY1305, EDWARDS25519SHA512BATCH, deserializeKey, keyId, keygen, serializeKey } from '../../../shared/domains/chelonia/crypto.js'
import type { GIRegParams } from './types.js'
import { encryptedAction } from './utils.js'

export default (sbp('sbp/selectors/register', {
  'gi.actions/chatroom/create': async function (params: GIRegParams) {
    try {
      let cskOpts = params.options?.csk
      let cekOpts = params.options?.cek

      const rootState = sbp('state/vuex/state')
      const userID = rootState.loggedIn.identityContractID

      if (!cekOpts) {
        const CEK = keygen(CURVE25519XSALSA20POLY1305)
        const CEKid = keyId(CEK)
        const CEKp = serializeKey(CEK, false)
        const CEKs = encryptedOutgoingDataWithRawKey(CEK, serializeKey(CEK, true))

        cekOpts = {
          id: CEKid,
          foreignKey: undefined,
          meta: {
            private: {
              content: CEKs,
              shareable: true
            }
          },
          data: CEKp,
          _rawKey: CEK
        }
      }

      if (!cskOpts) {
        const CSK = keygen(EDWARDS25519SHA512BATCH)
        const CSKid = keyId(CSK)
        const CSKp = serializeKey(CSK, false)
        const CSKs = encryptedOutgoingDataWithRawKey(cekOpts._rawKey ? cekOpts._rawKey : deserializeKey(cekOpts.data), serializeKey(CSK, true))

        cskOpts = {
          id: CSKid,
          foreignKey: undefined,
          meta: {
            private: {
              content: CSKs,
              shareable: true
            }
          },
          data: CSKp,
          _rawKey: CSK
        }
      }

      console.log('Chatroom create', {
        ...omit(params, ['options']), // any 'options' are for this action, not for Chelonia
        signingKeyId: cskOpts.id,
        actionSigningKeyId: cskOpts.id,
        actionEncryptionKeyId: cekOpts.id,
        keys: [
          {
            id: cskOpts.id,
            name: 'csk',
            purpose: ['sig'],
            ringLevel: 1,
            permissions: '*',
            allowedActions: '*',
            foreignKey: cskOpts.foreignKey,
            meta: cskOpts.meta,
            data: cskOpts.data
          },
          {
            id: cekOpts.id,
            name: 'cek',
            purpose: ['enc'],
            ringLevel: 1,
            permissions: [GIMessage.OP_ACTION_ENCRYPTED],
            allowedActions: '*',
            foreignKey: cekOpts.foreignKey,
            meta: cekOpts.meta,
            data: cekOpts.data
          }
        ],
        contractName: 'gi.contracts/chatroom'
      })

      // Before creating the contract, put all keys into transient store
      sbp('chelonia/storeSecretKeys',
        [cekOpts._rawKey, cskOpts._rawKey].map(key => ({ key, transient: true }))
      )

      const userCSKid = findKeyIdByName(rootState[userID], 'csk')
      if (!userCSKid) throw new Error('User CSK id not found')

      const chatroom = await sbp('chelonia/out/registerContract', {
        ...omit(params, ['options']), // any 'options' are for this action, not for Chelonia
        signingKeyId: cskOpts.id,
        actionSigningKeyId: cskOpts.id,
        actionEncryptionKeyId: cekOpts.id,
        keys: [
          {
            id: cskOpts.id,
            name: 'csk',
            purpose: ['sig'],
            ringLevel: 1,
            permissions: '*',
            allowedActions: '*',
            foreignKey: cskOpts.foreignKey,
            meta: cskOpts.meta,
            data: cskOpts.data
          },
          {
            id: cekOpts.id,
            name: 'cek',
            purpose: ['enc'],
            ringLevel: 1,
            permissions: [GIMessage.OP_ACTION_ENCRYPTED],
            allowedActions: '*',
            foreignKey: cekOpts.foreignKey,
            meta: cekOpts.meta,
            data: cekOpts.data
          },
          {
            foreignKey: `sp:${encodeURIComponent(userID)}?keyName=${encodeURIComponent('csk')}`,
            id: userCSKid,
            data: rootState[userID]._vm.authorizedKeys[userCSKid].data,
            // TODO: permissions for inner signing key7s
            permissions: [],
            // TODO: permissions for inner signing key7s
            allowedActions: [],
            purpose: ['sig'],
            ringLevel: Number.MAX_SAFE_INTEGER,
            name: `${userID}/${userCSKid}`
          }
        ],
        contractName: 'gi.contracts/chatroom'
      })

      const contractID = chatroom.contractID()

      // After the contract has been created, store pesistent keys
      sbp('chelonia/storeSecretKeys',
        [cekOpts._rawKey, cskOpts._rawKey].map(key => ({ key }))
      )

      await sbp('chelonia/contract/sync', contractID)

      return chatroom
    } catch (e) {
      console.error('gi.actions/chatroom/register failed!', e)
      throw new GIErrorUIRuntimeError(L('Failed to create chat channel.'))
    }
  },
  'gi.actions/chatroom/shareNewKeys': (contractID: string, newKeys) => {
    const rootState = sbp('state/vuex/state')
    const state = rootState[contractID]

    const originatingContractID = state.attributes.groupContractID ? state.attributes.groupContractID : contractID

    // $FlowFixMe
    return Promise.all(Object.keys(state.users).map(async (username) => {
      const pContractID = await sbp('namespace/lookup', username)
      const CEKid = findKeyIdByName(rootState[pContractID], 'cek')
      if (!CEKid) {
        console.warn(`Unable to share rotated keys for ${originatingContractID} with ${pContractID}: Missing CEK`)
        return Promise.resolve()
      }
      return {
        contractID,
        foreignContractID: pContractID,
        // $FlowFixMe
        keys: Object.values(newKeys).map(([, newKey, newId]: [any, Key, string]) => ({
          id: newId,
          meta: {
            private: {
              content: encryptedOutgoingData(rootState[pContractID], CEKid, serializeKey(newKey, true))
            }
          }
        }))
      }
    }))
  },
  ...encryptedAction('gi.actions/chatroom/addMessage', L('Failed to add message.')),
  ...encryptedAction('gi.actions/chatroom/editMessage', L('Failed to edit message.')),
  ...encryptedAction('gi.actions/chatroom/deleteMessage', L('Failed to delete message.')),
  ...encryptedAction('gi.actions/chatroom/makeEmotion', L('Failed to make emotion.')),
  ...encryptedAction('gi.actions/chatroom/join', L('Failed to join chat channel.'), async (sendMessage, params, signingKeyId) => {
    const rootGetters = sbp('state/vuex/getters')
    const rootState = sbp('state/vuex/state')
    const userID = rootGetters.ourContactProfiles[params.data.username]?.contractID

    if (!userID || !has(rootState, userID)) {
      throw new Error(`Unable to send gi.actions/chatroom/join on ${params.contractID} because user ID contract ${userID} is missing`)
    }

    const userCSKid = sbp('chelonia/contract/currentKeyIdByName', userID, 'csk')

    await sbp('chelonia/contract/sync', params.contractID)

    // Add the user's CSK to the contract
    await sbp('chelonia/out/keyAdd', {
      contractID: params.contractID,
      contractName: 'gi.contracts/chatroom',
      data: [{
        foreignKey: `sp:${encodeURIComponent(userID)}?keyName=${encodeURIComponent('csk')}`,
        id: userCSKid,
        data: rootState[userID]._vm.authorizedKeys[userCSKid].data,
        // TODO: Permissions
        // TODO: Remove key when leaving group
        // TODO: Do the same when joining a chatroom
        permissions: [],
        allowedActions: [],
        purpose: ['sig'],
        ringLevel: Number.MAX_SAFE_INTEGER,
        name: `${userID}/${userCSKid}`
      }],
      signingKeyId
    })

    return sendMessage(params)
  }),
  ...encryptedAction('gi.actions/chatroom/rename', L('Failed to rename chat channel.')),
  ...encryptedAction('gi.actions/chatroom/changeDescription', L('Failed to change chat channel description.')),
  ...encryptedAction('gi.actions/chatroom/leave', L('Failed to leave chat channel.')),
  ...encryptedAction('gi.actions/chatroom/delete', L('Failed to delete chat channel.')),
  ...encryptedAction('gi.actions/chatroom/voteOnPoll', L('Failed to vote on a poll.')),
  ...encryptedAction('gi.actions/chatroom/changeVoteOnPoll', L('Failed to change vote on a poll.')),
  ...encryptedAction('gi.actions/chatroom/closePoll', L('Failed to close a poll.'))
}): string[])
