'use strict'
import sbp from '@sbp/sbp'
import { CURVE25519XSALSA20POLY1305, EDWARDS25519SHA512BATCH, keyId, keygen, serializeKey, encrypt } from '~/shared/domains/chelonia/crypto.js'
import L from '@view-utils/translations.js'
import { GIErrorUIRuntimeError } from '@model/errors.js'
import { omit } from '~/frontend/utils/giLodash.js'
import { encryptedAction } from './utils.js'
import { GIMessage } from '~/shared/domains/chelonia/GIMessage.js'
import type { GIRegParams } from './types.js'

export default (sbp('sbp/selectors/register', {
  'gi.actions/chatroom/create': async function (params: GIRegParams) {
    try {
      // Create the necessary keys to initialise the contract
      // eslint-disable-next-line camelcase
      const CSK = keygen(EDWARDS25519SHA512BATCH)
      const CEK = keygen(CURVE25519XSALSA20POLY1305)

      // Key IDs
      const CSKid = keyId(CSK)
      const CEKid = keyId(CEK)

      // Public keys to be stored in the contract
      const CSKp = serializeKey(CSK, false)
      const CEKp = serializeKey(CEK, false)

      // Secret keys to be stored encrypted in the contract
      const CSKs = encrypt(CEK, serializeKey(CSK, true))
      const CEKs = encrypt(CEK, serializeKey(CEK, true))

      const chatroom = await sbp('chelonia/with-env', '', {
        additionalKeys: {
          [CSKid]: CSK,
          [CEKid]: CEK
        }
      }, ['chelonia/out/registerContract', {
        ...omit(params, ['options']), // any 'options' are for this action, not for Chelonia
        signingKeyId: CSKid,
        actionSigningKeyId: CSKid,
        actionEncryptionKeyId: CEKid,
        keys: [
          {
            id: CSKid,
            type: CSK.type,
            data: CSKp,
            permissions: [GIMessage.OP_CONTRACT, GIMessage.OP_KEY_ADD, GIMessage.OP_KEY_DEL, GIMessage.OP_ACTION_UNENCRYPTED, GIMessage.OP_ACTION_ENCRYPTED, GIMessage.OP_ATOMIC, GIMessage.OP_CONTRACT_AUTH, GIMessage.OP_CONTRACT_DEAUTH],
            meta: {
              type: 'csk',
              private: {
                keyId: CEKid,
                content: CSKs
              }
            }
          },
          {
            id: CEKid,
            type: CEK.type,
            data: CEKp,
            permissions: [GIMessage.OP_ACTION_ENCRYPTED],
            meta: {
              type: 'cek',
              private: {
                keyId: CEKid,
                content: CEKs
              }
            }
          }
        ],
        contractName: 'gi.contracts/chatroom'
      }])

      const contractID = chatroom.contractID()

      await sbp('chelonia/with-env', contractID, { additionalKeys: { [CEKid]: CEK } }, ['chelonia/contract/sync', contractID])

      return chatroom
    } catch (e) {
      console.error('gi.actions/chatroom/register failed!', e)
      throw new GIErrorUIRuntimeError(L('Failed to create chat channel.'))
    }
  },
  ...encryptedAction('gi.actions/chatroom/addMessage', L('Failed to add message.')),
  ...encryptedAction('gi.actions/chatroom/join', L('Failed to join chat channel.')),
  ...encryptedAction('gi.actions/chatroom/rename', L('Failed to rename chat channel.')),
  ...encryptedAction('gi.actions/chatroom/changeDescription', L('Failed to change chat channel description.')),
  ...encryptedAction('gi.actions/chatroom/leave', L('Failed to leave chat channel.')),
  ...encryptedAction('gi.actions/chatroom/delete', L('Failed to delete chat channel.'))
}): string[])
