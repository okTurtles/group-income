'use strict'

import sbp from '@sbp/sbp'
// Using relative path to crypto.js instead of ~-path to workaround some esbuild bug
import { CURVE25519XSALSA20POLY1305, EDWARDS25519SHA512BATCH, keyId, keygen, serializeKey, encrypt } from '../../../shared/domains/chelonia/crypto.js'
import { GIErrorUIRuntimeError, L, LError } from '@common/common.js'
import { omit } from '@model/contracts/shared/giLodash.js'
import { CHATROOM_PRIVACY_LEVEL, CHATROOM_TYPES } from '@model/contracts/shared/constants.js'
import { encryptedAction } from './utils.js'
import { GIMessage } from '~/shared/domains/chelonia/chelonia.js'
import type { GIActionParams } from './types.js'

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
  'gi.actions/mailbox/createDirectMessage': async function (params: GIActionParams) {
    try {
      const rootState = sbp('state/vuex/state')
      const rootGetters = sbp('state/vuex/getters')
      const partnerProfile = rootGetters.ourContactProfiles[params.data.username]

      if (!partnerProfile) {
        throw new GIErrorUIRuntimeError(L('Incorrect username to create direct message.'))
      }

      const message = await sbp('gi.actions/chatroom/create', {
        data: {
          attributes: {
            name: '',
            description: '',
            privacyLevel: CHATROOM_PRIVACY_LEVEL.PRIVATE,
            type: CHATROOM_TYPES.INDIVIDUAL
          }
        },
        hooks: {
          prepublish: params.hooks?.prepublish,
          postpublish: null
        }
      })

      await sbp('gi.actions/chatroom/join', {
        ...omit(params, ['options', 'data', 'hook']),
        contractID: message.contractID(),
        data: { username: rootState.loggedIn.username }
      })

      const paramsData = {
        username: params.data.username,
        contractID: message.contractID()
      }
      await sbp('chelonia/out/actionEncrypted', {
        ...omit(params, ['options', 'data', 'hook']),
        data: paramsData,
        action: 'gi.contracts/mailbox/createDirectMessage'
      })

      await sbp('gi.actions/chatroom/join', {
        ...omit(params, ['options', 'data', 'hook']),
        contractID: message.contractID(),
        data: { username: partnerProfile.username }
      })

      await sbp('gi.actions/mailbox/joinDirectMessage', {
        ...omit(params, ['options', 'data', 'hook']),
        contractID: partnerProfile.mailbox,
        data: paramsData,
        hooks: {
          prepublish: null,
          postpublish: params.hooks?.postpublish
        }
      })
    } catch (e) {
      console.error('gi.actions/mailbox/createDirectMessage failed!', e)
      throw new GIErrorUIRuntimeError(L('Failed to create a new direct message channel.'))
    }
  },
  ...encryptedAction('gi.actions/mailbox/setAttributes', L('Failed to set mailbox attributes.')),
  ...encryptedAction('gi.actions/mailbox/joinDirectMessage', L('Failed to join a new direct message channel.')),
  ...encryptedAction('gi.actions/mailbox/leaveDirectMessage', L('Failed to leave direct message channel.'))
}): string[])
