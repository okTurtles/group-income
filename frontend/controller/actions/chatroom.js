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
import { encryptedAction, encryptedNotification } from './utils.js'

export default (sbp('sbp/selectors/register', {
  'gi.actions/chatroom/create': async function (params: GIRegParams, billableContractID: string) {
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

      const CEK = cekOpts._rawKey ? cekOpts._rawKey : deserializeKey(cekOpts.data)

      if (!cskOpts) {
        const CSK = keygen(EDWARDS25519SHA512BATCH)
        const CSKid = keyId(CSK)
        const CSKp = serializeKey(CSK, false)
        const CSKs = encryptedOutgoingDataWithRawKey(CEK, serializeKey(CSK, true))

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

      // Before creating the contract, put all keys into transient store
      sbp('chelonia/storeSecretKeys',
        // $FlowFixMe[incompatible-use]
        () => [cekOpts._rawKey, cskOpts._rawKey].map(key => ({ key, transient: true }))
      )

      const userCSKid = findKeyIdByName(rootState[userID], 'csk')
      if (!userCSKid) throw new Error('User CSK id not found')

      const SAK = keygen(EDWARDS25519SHA512BATCH)
      const SAKid = keyId(SAK)
      const SAKp = serializeKey(SAK, false)
      const SAKs = encryptedOutgoingDataWithRawKey(CEK, serializeKey(SAK, true))

      const chatroom = await sbp('chelonia/out/registerContract', {
        ...omit(params, ['options']), // any 'options' are for this action, not for Chelonia
        publishOptions: {
          billableContractID,
          ...params.publishOptions
        },
        signingKeyId: cskOpts.id,
        actionSigningKeyId: cskOpts.id,
        actionEncryptionKeyId: cekOpts.id,
        keys: [
          {
            id: cskOpts.id,
            name: 'csk',
            purpose: ['sig'],
            ringLevel: 0,
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
            ringLevel: 0,
            permissions: [GIMessage.OP_ACTION_ENCRYPTED],
            allowedActions: '*',
            foreignKey: cekOpts.foreignKey,
            meta: cekOpts.meta,
            data: cekOpts.data
          },
          ...(params.options?.groupKeys
            ? [
                {
                  id: params.options.groupKeys[0].id,
                  name: 'group-csk',
                  purpose: ['sig'],
                  ringLevel: 2,
                  permissions: [GIMessage.OP_ATOMIC, GIMessage.OP_KEY_DEL, GIMessage.OP_ACTION_ENCRYPTED],
                  allowedActions: ['gi.contracts/chatroom/leave'],
                  foreignKey: params.options.groupKeys[0].foreignKey,
                  meta: params.options.groupKeys[0].meta,
                  data: params.options.groupKeys[0].data
                },
                {
                  id: params.options.groupKeys[1].id,
                  name: 'group-cek',
                  purpose: ['enc'],
                  ringLevel: 2,
                  permissions: [GIMessage.OP_ATOMIC, GIMessage.OP_KEY_ADD, GIMessage.OP_KEY_DEL, GIMessage.OP_ACTION_ENCRYPTED],
                  allowedActions: ['gi.contracts/chatroom/join', 'gi.contracts/chatroom/leave'],
                  foreignKey: params.options.groupKeys[1].foreignKey,
                  meta: params.options.groupKeys[1].meta,
                  data: params.options.groupKeys[1].data
                }
              ]
            : []),
          {
            id: SAKid,
            name: '#sak',
            purpose: ['sak'],
            ringLevel: 0,
            permissions: [],
            allowedActions: [],
            meta: {
              private: {
                content: SAKs
              }
            },
            data: SAKp
          }
        ],
        data: {
          ...params.data,
          attributes: {
            ...params.data?.attributes,
            creatorID: userID
          }
        },
        contractName: 'gi.contracts/chatroom'
      })

      // After the contract has been created, store pesistent keys
      sbp('chelonia/storeSecretKeys',
        // $FlowFixMe[incompatible-use]
        () => [cekOpts._rawKey, cskOpts._rawKey].map(key => ({ key }))
      )

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
    return Promise.all(Object.keys(state.members).map((pContractID) => {
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
              content: encryptedOutgoingData(pContractID, CEKid, serializeKey(newKey, true))
            }
          }
        }))
      }
    }))
  },
  ...encryptedNotification('gi.actions/chatroom/user-typing-event', L('Failed to send typing notification')),
  ...encryptedNotification('gi.actions/chatroom/user-stop-typing-event', L('Failed to send stopped typing notification')),
  ...encryptedAction('gi.actions/chatroom/addMessage', L('Failed to add message.')),
  ...encryptedAction('gi.actions/chatroom/editMessage', L('Failed to edit message.')),
  ...encryptedAction('gi.actions/chatroom/deleteMessage', L('Failed to delete message.')),
  ...encryptedAction('gi.actions/chatroom/deleteAttachment', L('Failed to delete attachment of message.')),
  ...encryptedAction('gi.actions/chatroom/makeEmotion', L('Failed to make emotion.')),
  ...encryptedAction('gi.actions/chatroom/join', L('Failed to join chat channel.'), async (sendMessage, params, signingKeyId) => {
    const rootState = sbp('state/vuex/state')
    const userID = params.data.memberID || rootState.loggedIn.identityContractID

    // We need to read values from both the chatroom and the identity contracts'
    // state, so we call wait to run the rest of this function after all
    // operations in those contracts have completed
    await sbp('chelonia/contract/wait', [params.contractID, userID])

    if (!userID || !has(rootState.contracts, userID)) {
      throw new Error(`Unable to send gi.actions/chatroom/join on ${params.contractID} because user ID contract ${userID} is missing`)
    }

    const CEKid = params.encryptionKeyId || sbp('chelonia/contract/currentKeyIdByName', params.contractID, 'cek')

    const userCSKid = sbp('chelonia/contract/currentKeyIdByName', userID, 'csk')
    return await sbp('chelonia/out/atomic', {
      ...params,
      contractName: 'gi.contracts/chatroom',
      data: [
        // Add the user's CSK to the contract
        [
          'chelonia/out/keyAdd', {
            // TODO: Find a way to have this wrapping be done by Chelonia directly
            data: [encryptedOutgoingData(params.contractID, CEKid, {
              foreignKey: `sp:${encodeURIComponent(userID)}?keyName=${encodeURIComponent('csk')}`,
              id: userCSKid,
              data: rootState[userID]._vm.authorizedKeys[userCSKid].data,
              permissions: [GIMessage.OP_ACTION_ENCRYPTED + '#inner'],
              allowedActions: '*',
              purpose: ['sig'],
              ringLevel: Number.MAX_SAFE_INTEGER,
              name: `${userID}/${userCSKid}`
            })]
          }
        ],
        sendMessage({ ...params, returnInvocation: true })
      ],
      signingKeyId
    })
  }),
  ...encryptedAction('gi.actions/chatroom/rename', L('Failed to rename chat channel.')),
  ...encryptedAction('gi.actions/chatroom/changeDescription', L('Failed to change chat channel description.')),
  ...encryptedAction('gi.actions/chatroom/leave', L('Failed to leave chat channel.'), async (sendMessage, params, signingKeyId) => {
    const userID = params.data.memberID
    const keyIds = userID && sbp('chelonia/contract/foreignKeysByContractID', params.contractID, userID)

    if (keyIds?.length) {
      return await sbp('chelonia/out/atomic', {
        ...params,
        contractName: 'gi.contracts/chatroom',
        data: [
          sendMessage({ ...params, returnInvocation: true }),
          // Remove the user's CSK from the contract
          [
            'chelonia/out/keyDel', {
              data: keyIds
            }
          ]
        ],
        signingKeyId
      })
    }

    return await sendMessage(params)
  }),
  ...encryptedAction('gi.actions/chatroom/delete', L('Failed to delete chat channel.')),
  ...encryptedAction('gi.actions/chatroom/voteOnPoll', L('Failed to vote on a poll.')),
  ...encryptedAction('gi.actions/chatroom/changeVoteOnPoll', L('Failed to change vote on a poll.')),
  ...encryptedAction('gi.actions/chatroom/closePoll', L('Failed to close a poll.'))
}): string[])
