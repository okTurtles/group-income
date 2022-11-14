'use strict'

import sbp from '@sbp/sbp'
// Using relative path to crypto.js instead of ~-path to workaround some esbuild bug
import { CURVE25519XSALSA20POLY1305, EDWARDS25519SHA512BATCH, keyId, keygen, serializeKey, encrypt } from '../../../shared/domains/chelonia/crypto.js'
import { GIErrorUIRuntimeError, L, LError } from '@common/common.js'
import { GIMessage } from '~/shared/domains/chelonia/chelonia.js'
import { encryptedAction } from './utils.js'

export default (sbp('sbp/selectors/register', {
  'gi.actions/mailbox/create': async function ({
    data = {}, options: { sync = true } = {}, publishOptions
  }): Promise<GIMessage> {
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

      await sbp('chelonia/configure', {
        transientSecretKeys: {
          [CSKid]: CSK,
          [CEKid]: CEK
        }
      })

      const mailbox = await sbp('chelonia/out/registerContract', {
        contractName: 'gi.contracts/mailbox',
        publishOptions,
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
        data
      })
      console.log('gi.actions/mailbox/create', { mailbox })
      const contractID = mailbox.contractID()
      if (sync) {
        await sbp('chelonia/contract/sync', contractID)
      }
      return mailbox
    } catch (e) {
      console.error('gi.actions/mailbox/create failed!', e)
      throw new GIErrorUIRuntimeError(L('Failed to create mailbox: {reportError}', LError(e)))
    }
  },
  ...encryptedAction('gi.actions/mailbox/postMessage', L('Failed to post message to mailbox.'))
}): string[])
