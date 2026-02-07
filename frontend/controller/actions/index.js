import { has, pick } from 'turtledash'
import sbp from '@sbp/sbp'
import type { SPKey } from '@chelonia/lib/SPMessage'
import { SPMessage } from '@chelonia/lib/SPMessage'
import { encryptedDataKeyId, encryptedOutgoingData, encryptedOutgoingDataWithRawKey } from '@chelonia/lib/encryptedData'
import { findKeyIdByName, findSuitableSecretKeyId } from '@chelonia/lib/utils'
import { keyId, keygenOfSameType, serializeKey } from '@chelonia/crypto'

export { default as chatroom } from './chatroom.js'
export { default as group } from './group.js'
export { default as groupKV } from './group-kv.js'
export { default as identity } from './identity.js'
export { default as identityKV } from './identity-kv.js'

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
    keyIds,
    returnInvocation
  }) => {
    if (contractID === subjectContractID) {
      return
    }

    const contractState = await sbp('chelonia/latestContractState', subjectContractID)

    try {
      await sbp('chelonia/contract/retain', contractID, { ephemeral: true })
      const state = await sbp('chelonia/latestContractState', contractID)

      const CEKid = findKeyIdByName(state, 'cek')
      const signingKeyId = findSuitableSecretKeyId(state, [SPMessage.OP_KEY_SHARE], ['sig'])

      if (!CEKid || !state?._vm?.authorizedKeys?.[CEKid]) {
        throw new Error('Missing CEK; unable to proceed sharing keys')
      }

      // TODO: Use 'chelonia/haveSecretKey'
      const secretKeys = await sbp('chelonia/rootState')['secretKeys']

      const keysToShare = Array.isArray(keyIds)
        ? pick(secretKeys, keyIds)
        : keyIds === '*'
          ? pick(secretKeys, Object.entries(contractState._vm.authorizedKeys)
            .filter(([, key]) => {
              return !!((key: any): SPKey).meta?.private?.content
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
              content: encryptedOutgoingData(contractID, CEKid, key)
            }
          }
        }))
      }

      const invocation = ['chelonia/out/keyShare', {
        contractID,
        contractName,
        data: encryptedOutgoingData(contractID, CEKid, payload),
        signingKeyId
      }]
      if (returnInvocation) return invocation

      await sbp(...invocation)
    } finally {
      await sbp('chelonia/contract/release', contractID, { ephemeral: true })
    }
  },
  // TODO: Move to chelonia
  'gi.actions/out/rotateKeysInternal': async (
    contractID: string,
    contractName: string,
    keysToRotate: string[] | '*' | 'pending',
    // Additional operations to be done along with key roation.
    // If any, it should return an array of arrays of invocations that can be
    // passed to `'chelonia/out/atomic'`. The first element of the array are
    // operations to be done before `keyUpdate` and the second element are
    // to be added after `keyUpdate`.
    addtionalOperationsSelector?: string,
    options?: { direct?: boolean, lastAttempt?: boolean }
  ) => {
    const state = sbp('chelonia/contract/state', contractID)

    if (!state) {
      throw new Error(`[gi.actions/out/rotateKeys] Cannot rotate keys for ${contractID}: No state exists`)
    }

    let ringLevel = Number.MAX_SAFE_INTEGER

    // $FlowFixMe
    const newKeys = Object.fromEntries(Object.entries(state._vm.authorizedKeys).filter(([id, data]: [string, SPKey]) => {
      return !!data.meta?.private?.content && data._notAfterHeight == null && (
        Array.isArray(keysToRotate)
          ? keysToRotate.includes(data.name)
          : keysToRotate === '*'
            ? true
            // $FlowFixMe
            : state._volatile?.pendingKeyRevocations && has(state._volatile.pendingKeyRevocations, id))
    }).map(([id, data]: [string, SPKey]) => {
      const newKey = keygenOfSameType(data.data)
      return [data.name, [id, newKey, keyId(newKey), encryptedDataKeyId(data.meta.private.content)]]
    }))

    if (!Object.keys(newKeys).length) {
      console.debug('rotateKeys: No keys to rotate', { contractID })
      return
    }

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
              : encryptedOutgoingData(contractID, keyId(encryptionKey), serializeKey(newKey, true)),
            shareable: state._vm.authorizedKeys[id].meta.private.shareable
          }
        }
      }
    })

    const signingKeyId = findSuitableSecretKeyId(state, [SPMessage.OP_ATOMIC, SPMessage.OP_KEY_SHARE, SPMessage.OP_KEY_UPDATE], ['sig'], ringLevel)

    if (!signingKeyId) {
      throw new Error('No suitable signing key found')
    }

    // Additional operations to be done along with key roation.
    // E.g., share new keys with other contracts
    const additionalOperations = addtionalOperationsSelector ? await sbp(addtionalOperationsSelector, contractID, newKeys, { lastAttempt: options?.lastAttempt }) : undefined

    const preSendCheck = (msg, state) => {
      const updatedKeysRemaining = updatedKeys.filter((key) => {
        return state._vm.authorizedKeys[key.oldKeyId]._notAfterHeight == null
      })

      if (updatedKeysRemaining.length === 0) return false

      // TODO: Update msg to remove unnecessary keys
      return true
    }

    if (Array.isArray(additionalOperations) && additionalOperations.length > 0) {
      // Issue OP_ATOMIC
      await sbp('chelonia/out/atomic', {
        contractID,
        contractName,
        data: [
          ...(additionalOperations[0] ?? []),
          ['chelonia/out/keyUpdate', { data: updatedKeys }],
          ...(additionalOperations[1] ?? [])
        ],
        signingKeyId,
        hooks: {
          preSendCheck
        }
      })
    } else {
      // Issue OP_KEY_UPDATE
      await sbp('chelonia/out/keyUpdate', {
        contractID,
        contractName,
        data: updatedKeys,
        signingKeyId,
        hooks: {
          preSendCheck
        }
      })
    }
  },
  'gi.actions/out/rotateKeys': async (
    contractID: string,
    contractName: string,
    keysToRotate: string[] | '*' | 'pending',
    // Additional operations to be done along with key roation.
    // If any, it should return an array of arrays of invocations that can be
    // passed to `'chelonia/out/atomic'`. The first element of the array are
    // operations to be done before `keyUpdate` and the second element are
    // to be added after `keyUpdate`.
    addtionalOperationsSelector?: string,
    options?: { direct?: boolean, lastAttempt?: boolean }
  ) => {
    if (options?.direct) {
      return await sbp('gi.actions/out/rotateKeysInternal', contractID, contractName, keysToRotate, addtionalOperationsSelector)
    }
    return await sbp('chelonia.persistentActions/enqueue', {
      invocation: ['gi.actions/out/rotateKeysInternal', contractID, contractName, keysToRotate, addtionalOperationsSelector, { ...options, lastAttempt: false }],
      maxAttempts: 3,
      retrySeconds: 60,
      totalFailureInvocation: ['gi.actions/out/rotateKeysInternal', contractID, contractName, keysToRotate, addtionalOperationsSelector, { ...options, lastAttempt: true }]
    })
  }
})
