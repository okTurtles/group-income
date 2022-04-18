'use strict'

import sbp from '~/shared/sbp.js'
import { GIErrorUIRuntimeError } from '@model/errors.js'
import L, { LError } from '@view-utils/translations.js'
import { imageUpload } from '@utils/image.js'
import '@utils/crypto.js'
import './mailbox.js'

import { encryptedAction } from './utils.js'
import { GIMessage } from '../../../shared/domains/chelonia/GIMessage.js'

export default (sbp('sbp/selectors/register', {
  'gi.actions/identity/retrieveSalt': async (username: string, password: string) => {
    // TODO RETRIEVE FROM SERVER
    return await Promise.resolve('SALT CHANGEME')
  },
  'gi.actions/identity/create': async function ({
    data: { username, email, password, picture },
    options: { sync = true } = {},
    publishOptions
  }) {
    // TODO: make sure we namespace these names:
    //       https://github.com/okTurtles/group-income/issues/598
    const oldSettings = await sbp('gi.db/settings/load', username)
    if (oldSettings) {
      // TODO: prompt to ask user before deleting and overwriting an existing user
      //       https://github.com/okTurtles/group-income/issues/599
      console.warn(`deleting settings for pre-existing identity ${username}!`, oldSettings)
      await sbp('gi.db/settings/delete', username)
    }

    let finalPicture = `${window.location.origin}/assets/images/user-avatar-default.png`

    if (picture) {
      try {
        finalPicture = await imageUpload(picture)
      } catch (e) {
        console.error('actions/identity.js picture upload error:', e)
        throw new GIErrorUIRuntimeError(L('Failed to upload the profile picture. {codeError}', { codeError: e.message }))
      }
    }
    // proceed with creation
    // first create the mailbox for the user and subscribe to it
    // and do this outside of a try block so that if it throws the error just gets passed up
    const mailbox = await sbp('gi.actions/mailbox/create', { options: { sync: true } })
    const mailboxID = mailbox.contractID()

    // Create the necessary keys to initialise the contract
    // TODO: The salt needs to be dynamically generated
    const salt = 'SALT CHANGEME' // sbp('gi.crypto/util/generateSalt')
    const IPK = await sbp('gi.crypto/key/fromPassword', 'edwards25519sha512batch', password, salt)
    const IEK = await sbp('gi.crypto/key/fromPassword', 'curve25519xsalsa20poly1305', password, salt)
    const CSK = sbp('gi.crypto/key/gen', 'edwards25519sha512batch')
    const CEK = sbp('gi.crypto/key/gen', 'curve25519xsalsa20poly1305')

    // Key IDs
    const IPKid = sbp('gi.crypto/key/id', IPK)
    const IEKid = sbp('gi.crypto/key/id', IEK)
    const CSKid = sbp('gi.crypto/key/id', CSK)
    const CEKid = sbp('gi.crypto/key/id', CEK)

    // Public keys to be stored in the contract
    const IPKp = sbp('gi.crypto/key/serialize', IPK, false)
    const IEKp = sbp('gi.crypto/key/serialize', IEK, false)
    const CSKp = sbp('gi.crypto/key/serialize', CSK, false)
    const CEKp = sbp('gi.crypto/key/serialize', CEK, false)

    // Secret keys to be stored encrypted in the contract
    const CSKs = sbp('gi.crypto/encrypt', IEK, sbp('gi.crypto/key/serialize', CSK, true))
    const CEKs = sbp('gi.crypto/encrypt', IEK, sbp('gi.crypto/key/serialize', CEK, true))

    // TODO REMOVEME
    alert(JSON.stringify({ IPKp, CSKp, CEKp, CSKs, CEKs }))

    let userID
    // next create the identity contract itself and associate it with the mailbox
    try {
      const user = await sbp('chelonia/out/registerContract', {
        contractName: 'gi.contracts/identity',
        publishOptions,
        hooks: {
          postpublish: async (contractMsg: GIMessage) => {
            const contractID = contractMsg.hash()
            await sbp('gi.db/keys/save', contractID, CSK)
            await sbp('gi.db/keys/save', contractID, CEK)
          }
        },
        data: {
          attributes: { username, email, picture: finalPicture }
        },
        keys: [
          {
            id: IPKid,
            type: IPK.type,
            data: IPKp,
            perm: [GIMessage.OP_CONTRACT, GIMessage.OP_KEY_ADD, GIMessage.OP_KEY_DEL],
            meta: {
              type: 'ipk'
            }
          },
          {
            id: IEKid,
            type: IEK.type,
            data: IEKp,
            perm: ['gi.contracts/identity/keymeta'],
            meta: {
              type: 'iek'
            }
          },
          {
            id: CSKid,
            type: CSK.type,
            data: CSKp,
            perm: [GIMessage.OP_ACTION_UNENCRYPTED, GIMessage.OP_ACTION_ENCRYPTED, GIMessage.OP_ATOMIC, GIMessage.OP_CONTRACT_AUTH, GIMessage.OP_CONTRACT_DEAUTH],
            meta: {
              type: 'csk',
              private: {
                keyId: IEKid,
                content: CSKs
              }
            }
          },
          {
            id: CEKid,
            type: CEK.type,
            data: CEKp,
            perm: [GIMessage.OP_ACTION_ENCRYPTED],
            meta: {
              type: 'cek',
              private: {
                keyId: IEKid,
                content: CEKs
              }
            }
          }
        ],
        signingKey: IPK
      })
      userID = user.contractID()
      if (sync) {
        await sbp('gi.actions/contract/syncAndWait', userID, { [IEKid]: IEK })
      }
      await sbp('gi.actions/identity/setAttributes', {
        contractID: userID, data: { mailbox: mailboxID }
      })
    } catch (e) {
      console.error('gi.actions/identity/create failed!', e)
      throw new GIErrorUIRuntimeError(L('Failed to create user identity: {reportError}', LError(e)))
    }
    return [userID, mailboxID]
  },
  'gi.actions/identity/signup': async function ({
    data: { username, email, password },
    options: { sync = true } = {},
    publishOptions
  }) {
    try {
      const randomAvatar = sbp('gi.utils/avatar/create')
      const [userID, mailboxID] = await sbp('gi.actions/identity/create', {
        data: {
          username,
          email,
          password,
          picture: randomAvatar
        },
        options: { sync },
        publishOptions
      })
      await sbp('namespace/register', username, userID)
      return [userID, mailboxID]
    } catch (e) {
      await sbp('gi.actions/identity/logout') // TODO: should this be here?
      console.error('gi.actions/identity/signup failed!', e)
      throw new GIErrorUIRuntimeError(L('Failed to signup: {reportError}', LError(e)))
    }
  },
  'gi.actions/identity/login': async function ({
    data: { username, password },
    options: { sync = true } = {}
  }) {
    // TODO: Insert cryptography here
    const userId = await sbp('namespace/lookup', username)
    if (!userId) {
      throw new GIErrorUIRuntimeError(L('Invalid username or password'))
    }

    const salt = await sbp('gi.actions/identity/retrieveSalt', username, password)
    const IEK = await sbp('gi.crypto/key/fromPassword', 'curve25519xsalsa20poly1305', password, salt)
    const IEKid = sbp('gi.crypto/key/id', IEK)

    try {
      console.debug(`Retrieved identity ${userId}`)
      // TODO: move the login vuex action code into this function (see #804)
      await sbp('state/vuex/dispatch', 'login', { username, identityContractID: userId, additionalKeys: { [IEKid]: IEK } })

      if (sync) {
        await sbp('gi.actions/contract/syncAndWait', userId, { [IEKid]: IEK })
      }

      return userId
    } catch (e) {
      console.error('gi.actions/identity/login failed!', e)
      throw new GIErrorUIRuntimeError(L('Failed to login: {reportError}', LError(e)))
    }
  },
  'gi.actions/identity/signupAndLogin': async function ({ data }) {
    const contractIDs = await sbp('gi.actions/identity/signup', {
      data, options: { sync: true }
    })
    await sbp('gi.actions/identity/login', {
      data, options: { sync: false } // don't need to sync since we already did
    })
    return contractIDs
  },
  'gi.actions/identity/logout': async function () {
    // TODO: move the logout vuex action code into this function (see #804)
    await sbp('state/vuex/dispatch', 'logout')
  },
  ...encryptedAction('gi.actions/identity/setAttributes', L('Failed to set profile attributes.')),
  ...encryptedAction('gi.actions/identity/updateSettings', L('Failed to update profile settings.'))
}): string[])
