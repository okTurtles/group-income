import { has, pick } from '@model/contracts/shared/giLodash.js'
import sbp from '@sbp/sbp'
import type { GIKey } from '~/shared/domains/chelonia/GIMessage.js'
import { GIMessage } from '~/shared/domains/chelonia/GIMessage.js'
import { encryptedDataKeyId, encryptedOutgoingData, encryptedOutgoingDataWithRawKey } from '~/shared/domains/chelonia/encryptedData.js'
import { findKeyIdByName, findSuitableSecretKeyId } from '~/shared/domains/chelonia/utils.js'
// Using relative path to crypto.js instead of ~-path to workaround some esbuild bug
import { keyId, keygenOfSameType, serializeKey } from '../../../shared/domains/chelonia/crypto.js'

export { default as chatroom } from './chatroom.js'
export { default as group } from './group.js'
export { default as identity } from './identity.js'

sbp('sbp/selectors/register', {
  // Utility function that covers the common scenario of needing to share some
  // contract's secret keys with another contract. This function emits OP_KEY_SHARE
  // by calling 'chelonia/out/keyShare'.
  // One common use case for this function is sharing keys with ourselves after
  // creating a new contract (for example, when we create a group) or to share
  // keys of a child contract with a parent contract (such as sharing the keys to
  // a chat room with its parent group contract)
  'gi.actions/out/shareVolatileKeys': async ({
    contractID,
    contractName,
    subjectContractID,
    keyIds
  }) => {
    if (contractID === subjectContractID) {
      return
    }

    const contractState = await sbp('chelonia/latestContractState', subjectContractID)

    const state = await sbp('chelonia/latestContractState', contractID)

    const CEKid = findKeyIdByName(state, 'cek')
    const signingKeyId = findSuitableSecretKeyId(state, [GIMessage.OP_KEY_SHARE], ['sig'])

    if (!CEKid || !state?._vm?.authorizedKeys?.[CEKid]) {
      throw new Error('Missing CEK; unable to proceed sharing keys')
    }

    const secretKeys = sbp('state/vuex/state')['secretKeys']

    const keysToShare = Array.isArray(keyIds)
      ? pick(secretKeys, keyIds)
      : keyIds === '*'
        ? pick(secretKeys, Object.entries(contractState._vm.authorizedKeys)
          .filter(([, key]) => {
            return !!((key: any): GIKey).meta?.private?.content
          })
          .map(([id]) => id)
        )
        : null

    if (!keysToShare) {
      throw new TypeError('Invalid parameter: keyIds')
    }

    const payload = {
      contractID: subjectContractID,
      keys: Object.entries(keysToShare).map(([keyId, key]: [string, mixed]) => ({
        id: keyId,
        meta: {
          private: {
            content: encryptedOutgoingData(state, CEKid, key)
          }
        }
      }))
    }

    await sbp('chelonia/out/keyShare', {
      contractID,
      contractName,
      data: encryptedOutgoingData(state, CEKid, payload),
      signingKeyId: signingKeyId
    })
  },
  // TODO: Move to chelonia
  'gi.actions/out/rotateKeys': async (
    contractID: string,
    contractName: string,
    keysToRotate: string[] | '*' | 'pending',
    shareNewKeysSelector?: string
  ) => {
    const rootState = sbp('state/vuex/state')
    const state = rootState[contractID]

    let ringLevel = Number.MAX_SAFE_INTEGER

    // $FlowFixMe
    const newKeys = Object.fromEntries(Object.entries(state._vm.authorizedKeys).filter(([id, data]: [string, GIKey]) => {
      return !!data.meta?.private?.content && data._notAfterHeight === undefined && (
        Array.isArray(keysToRotate)
          ? keysToRotate.includes(data.name)
          : keysToRotate === '*'
            ? true
            // $FlowFixMe
            : state._volatile?.pendingKeyRevocations && has(state._volatile.pendingKeyRevocations, id))
    }).map(([id, data]: [string, GIKey]) => {
      const newKey = keygenOfSameType(data.data)
      return [data.name, [id, newKey, keyId(newKey), encryptedDataKeyId(data.meta.private.content)]]
    }))

    // $FlowFixMe
    const updatedKeys = Object.values(newKeys).map(([id, newKey, newId, eKID]) => {
      const encryptionKeyName = state._vm.authorizedKeys[eKID].name
      const isRotatedEncryptionKey = has(newKeys, encryptionKeyName)
      const encryptionKey = isRotatedEncryptionKey ? newKeys[encryptionKeyName][1] : state._vm.authorizedKeys[eKID].data

      if (state._vm.authorizedKeys[id].ringLevel < ringLevel) {
        ringLevel = state._vm.authorizedKeys[id].ringLevel
      }

      return {
        name: state._vm.authorizedKeys[id].name,
        id: newId,
        oldKeyId: id,
        data: serializeKey(newKey, false),
        meta: {
          private: {
            // We have two cases to handle: (1) when there is a new encryption
            // key that is also being used to encrypt other keys and (2) when
            // the keys are encrypted with an existing key (which is not being
            // rotated)
            content: isRotatedEncryptionKey
              // For case (1), we need to call encryptedOutgoingDataWithRawKey
              // because the new encryption key does not yet exist in
              // _vm.authorizedKeys and because we want to encrypt keys with
              // the specific value of encryptionKey (which is a new encryption
              // key)
              ? encryptedOutgoingDataWithRawKey(encryptionKey, serializeKey(newKey, true))
              // For case (2), we call encryptedOutgoingData because the key
              // is already present in _vm.authorizedKeys and because it may
              // be rotated between the time we issue this operation and the
              // time it is written to the contract
              : encryptedOutgoingData(state, keyId(encryptionKey), serializeKey(newKey, true)),
            shareable: state._vm.authorizedKeys[id].meta.private.shareable
          }
        }
      }
    })

    const signingKeyId = findSuitableSecretKeyId(state, [], ['sig'], ringLevel)

    if (!signingKeyId) {
      throw new Error('No suitable signing key found')
    }

    // TODO: GI-specific
    const CEKid = findKeyIdByName(state, 'cek')
    if (!CEKid) return

    // Share new keys with other contracts
    const keyShares = shareNewKeysSelector ? await sbp(shareNewKeysSelector, contractID, newKeys) : undefined

    if (Array.isArray(keyShares) && keyShares.length > 0) {
      // Issue OP_ATOMIC
      await sbp('chelonia/out/atomic', {
        contractID,
        contractName,
        data: [
          ...keyShares.map((data) => ['chelonia/out/keyShare', { data: encryptedOutgoingData(state, CEKid, data) }]),
          ['chelonia/out/keyUpdate', { data: updatedKeys }]
        ],
        signingKeyId
      })
    } else {
      // Issue OP_KEY_UPDATE
      await sbp('chelonia/out/keyUpdate', {
        contractID,
        contractName,
        data: updatedKeys,
        signingKeyId
      })
    }
  }
})
