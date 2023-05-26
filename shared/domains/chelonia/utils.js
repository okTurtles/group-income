import sbp from '@sbp/sbp'
import type { GIKey, GIKeyPurpose } from './GIMessage.js'
import { GIMessage } from './GIMessage.js'
import { INVITE_STATUS } from './constants.js'
import type { Key } from './crypto.js'
import { decryptKey } from './crypto.js'
import { CONTRACT_IS_PENDING_KEY_REQUESTS } from './events.js'

export const findKeyIdByName = (state: Object, name: string): ?string => state._vm?.authorizedKeys && ((Object.values((state._vm.authorizedKeys: any)): any): GIKey[]).find((k) => k.name === name)?.id

export const findSuitableSecretKeyId = (state: Object, permissions: '*' | string[], purposes: GIKeyPurpose[], ringLevel?: number, additionalKeyIds: ?string[]): ?string => {
  return state._vm?.authorizedKeys &&
    (state._volatile?.keys || additionalKeyIds?.length) &&
    ((Object.values((state._vm.authorizedKeys: any)): any): GIKey[]).find((k) =>
      (k.ringLevel <= (ringLevel ?? Number.POSITIVE_INFINITY)) &&
      (state._volatile?.keys?.[k.id] || additionalKeyIds?.includes(k.id)) &&
      (Array.isArray(permissions)
        ? permissions.reduce((acc, permission) =>
          acc && (k.permissions === '*' || k.permissions.includes(permission)), true
        )
        : permissions === k.permissions
      ) &&
      purposes.reduce((acc, purpose) => acc && k.purpose.includes(purpose), true))?.id
}

// TODO: Resolve inviteKey being added (doesn't have krs permission)
export const findSuitablePublicKeyIds = (state: Object, permissions: '*' | string[], purposes: GIKeyPurpose[], ringLevel?: number): ?string[] => {
  return state._vm?.authorizedKeys &&
    ((Object.values((state._vm.authorizedKeys: any)): any): GIKey[]).filter((k) =>
      (k.ringLevel <= (ringLevel ?? Number.POSITIVE_INFINITY)) &&
      (Array.isArray(permissions)
        ? permissions.reduce((acc, permission) => acc && (k.permissions === '*' || k.permissions.includes(permission)), true)
        : permissions === k.permissions
      ) &&
      purposes.reduce((acc, purpose) => acc && k.purpose.includes(purpose), true))?.map((k) => k.id)
}

export const validateKeyAddPermissions = (contractID: string, signingKey: GIKey, state: Object, v: GIKey[]) => {
  const signingKeyPermissions = Array.isArray(signingKey.permissions) ? new Set(signingKey.permissions) : signingKey.permissions
  if (!state._vm?.authorizedKeys?.[signingKey.id]) throw new Error('Singing key for OP_KEY_ADD must exist in _vm.authorizedKeys. contractID=' + contractID + ' singingKeyId=' + signingKey.id)
  const localSigningKey = state._vm.authorizedKeys[signingKey.id]
  v.forEach(k => {
    if (!Number.isSafeInteger(k.ringLevel) || k.ringLevel < localSigningKey.ringLevel) {
      throw new Error('Signing key has ringLevel ' + localSigningKey.ringLevel + ' but attempted to add a key with rignLevel ' + k.ringLevel)
    }
    if (signingKeyPermissions !== '*') {
      if (!Array.isArray(k.permissions) || !k.permissions.reduce((acc, cv) => acc && signingKeyPermissions.has(cv), true)) {
        throw new Error('Unable to add key with more permissions than the signing key. singingKey permissions: ' + String(signingKey?.permissions) + '; key add permissions: ' + String(k.permissions))
      }
    }
  })
}

export const validateKeyDelPermissions = (contractID: string, signingKey: GIKey, state: Object, v: string[]) => {
  if (!state._vm?.authorizedKeys?.[signingKey.id]) throw new Error('Singing key for OP_KEY_DEL must exist in _vm.authorizedKeys. contractID=' + contractID + ' singingKeyId=' + signingKey.id)
  const localSigningKey = state._vm.authorizedKeys[signingKey.id]
  v.map(id => state._vm.authorizedKeys[id]).forEach((k, i) => {
    if (!k) throw new Error('Nonexisting key ID ' + v[i])
    if (!Number.isSafeInteger(k.ringLevel) || k.ringLevel < localSigningKey.ringLevel) {
      throw new Error('Signing key has ringLevel ' + localSigningKey.ringLevel + ' but attempted to remove a key with ringLevel ' + k.ringLevel)
    }
  })
}

export const keyAdditionProcessor = function (secretKeys: {[id: string]: Key}, keys: GIKey[], state: Object, contractID: string) {
  console.log('@@@@@ KAP Attempting to decrypt keys for ' + contractID)
  const decryptedKeys = []

  for (const key of keys) {
    let decryptedKey: ?string
    // Does the key have key.meta?.private? If so, attempt to decrypt it
    if (key.meta?.private && key.meta.private.keyId && key.meta.private.content) {
      if (key.id && key.meta.private.keyId in secretKeys && key.meta.private.content) {
        try {
          decryptedKey = decryptKey(key.id, secretKeys[key.meta.private.keyId], key.meta.private.content)
          decryptedKeys.push([key.id, decryptedKey])
        } catch (e) {
          console.error(`Secret key decryption error '${e.message || e}':`, e)
          // Ricardo feels this is an ambiguous situation, however if we rethrow it will
          // render the contract unusable because it will undo all our changes to the state,
          // and it's possible that an error here shouldn't necessarily break the entire
          // contract. For example, in some situations we might read a contract as
          // read-only and not have the key to write to it.
        }
      }
    }

    // Is this a an invite key? If so, run logic for invite keys and invitation
    // accounting
    if (key.name.startsWith('#inviteKey-')) {
      if (!state._vm.invites) this.config.reactiveSet(state._vm, 'invites', Object.create(null))
      this.config.reactiveSet(state._vm.invites, key.id, {
        creator: key.meta.creator,
        invitee: key.meta.invitee,
        status: INVITE_STATUS.VALID,
        initialQuantity: key.meta.quantity,
        quantity: key.meta.quantity,
        expires: key.meta.expires,
        inviteSecret: decryptedKey || state._volatile?.keys?.[key.id],
        responses: []
      })
    }

    // Is this KEY operation the result of requesting keys for another contract?
    console.log(['@@@@@KAP', key.meta?.keyRequest, findSuitableSecretKeyId(state, [GIMessage.OP_KEY_ADD], ['sig']), contractID])
    if (key.meta?.keyRequest && findSuitableSecretKeyId(state, [GIMessage.OP_KEY_ADD], ['sig'])) {
      const { id, contractID: keyRequestContractID, outerKeyId } = key.meta?.keyRequest

      const rootState = sbp(this.config.stateSelector)

      // Are we subscribed to this contract?
      // If we are not subscribed to the contract, we don't set pendingKeyRequests because we don't need that contract's state
      // Setting pendingKeyRequests in these cases could result in issues
      // when a corresponding OP_KEY_SHARE is received, which could trigger subscribing to this previously unsubscribed to contract
      if (keyRequestContractID) {
        if (!rootState[keyRequestContractID]) {
          this.config.reactiveSet(rootState, keyRequestContractID, { _volatile: { pendingKeyRequests: [] } })
        } else if (!rootState[keyRequestContractID]._volatile) {
          this.config.reactiveSet(rootState[keyRequestContractID], '_volatile', { pendingKeyRequests: [] })
        } else if (!rootState[keyRequestContractID]._volatile.pendingKeyRequests) {
          this.config.reactiveSet(rootState[keyRequestContractID]._volatile, 'pendingKeyRequests', [])
        }

        // Mark the contract for which keys were requested as pending keys
        rootState[keyRequestContractID]._volatile.pendingKeyRequests.push({ id, outerKeyId })

        this.setPostSyncOp(contractID, 'pending-keys-for-' + keyRequestContractID, ['okTurtles.events/emit', CONTRACT_IS_PENDING_KEY_REQUESTS, { contractID: keyRequestContractID }])
      }
    }

    // Is this a foreign key in this contract? If so, flag it in the
    // other contract to mirror operations
    if (key.foreignKey) {
      const fkUrl = new URL(key.foreignKey)
      const foreignContract = fkUrl.pathname
      const foreignKeyName = fkUrl.searchParams.get('keyName')

      if (!foreignContract || !foreignKeyName) throw new Error('Invalid foregin key: missing contract or key name')

      this.setPostSyncOp(contractID, `syncAndMirrorKeys-${foreignContract}-${encodeURIComponent(foreignKeyName)}`, ['chelonia/private/in/syncContractAndWatchKeys', foreignContract, foreignKeyName, contractID, key.id])
    }
  }

  console.log('@@@@@ KAP KL ' + decryptedKeys.length + ' cID ' + contractID)
  if (decryptedKeys.length) {
    if (!state._volatile) this.config.reactiveSet(state, '_volatile', Object.create(null))
    if (!state._volatile.keys) this.config.reactiveSet(state._volatile, 'keys', Object.create(null))

    for (const [id, value] of decryptedKeys) {
      this.config.reactiveSet(state._volatile.keys, id, value)
    }
  }
}
