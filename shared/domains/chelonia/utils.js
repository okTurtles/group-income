import sbp from '@sbp/sbp'
import type { GIKey, GIKeyPurpose, GIOpKeyUpdate } from './GIMessage.js'
import { GIMessage } from './GIMessage.js'
import { INVITE_STATUS } from './constants.js'
import { deserializeKey } from './crypto.js'
import { CONTRACT_IS_PENDING_KEY_REQUESTS } from './events.js'

export const findKeyIdByName = (state: Object, name: string): ?string => state._vm?.authorizedKeys && ((Object.values((state._vm.authorizedKeys: any)): any): GIKey[]).find((k) => k.name === name)?.id

export const findForeignKeysByContractID = (state: Object, contractID: string): string[] => state._vm?.authorizedKeys && ((Object.values((state._vm.authorizedKeys: any)): any): GIKey[]).filter((k) => k.foreignKey?.includes(contractID)).map(k => k.id)

export const findRevokedKeyIdsByName = (state: Object, name: string): string[] => state._vm?.authorizedKeys && ((Object.values((state._vm.revokedKeys: any) || {}): any): GIKey[]).filter((k) => k.name === name).map(k => k.id)

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
  const signingKeyAllowedActions = Array.isArray(signingKey.allowedActions) ? new Set(signingKey.allowedActions) : signingKey.allowedActions
  if (!state._vm?.authorizedKeys?.[signingKey.id]) throw new Error('Singing key for OP_KEY_ADD or OP_KEY_UPDATE must exist in _vm.authorizedKeys. contractID=' + contractID + ' singingKeyId=' + signingKey.id)
  const localSigningKey = state._vm.authorizedKeys[signingKey.id]
  v.forEach(k => {
    if (!Number.isSafeInteger(k.ringLevel) || k.ringLevel < localSigningKey.ringLevel) {
      throw new Error('Signing key has ringLevel ' + localSigningKey.ringLevel + ' but attempted to add or update a key with ringLevel ' + k.ringLevel)
    }
    if (signingKeyPermissions !== '*') {
      if (!Array.isArray(k.permissions) || !k.permissions.reduce((acc, cv) => acc && signingKeyPermissions.has(cv), true)) {
        throw new Error('Unable to add or update a key with more permissions than the signing key. singingKey permissions: ' + String(signingKey?.permissions) + '; key add permissions: ' + String(k.permissions))
      }
    }
    if (signingKeyAllowedActions !== '*' && k.allowedActions) {
      if (!signingKeyAllowedActions || !Array.isArray(k.allowedActions) || !k.allowedActions.reduce((acc, cv) => acc && signingKeyAllowedActions.has(cv), true)) {
        throw new Error('Unable to add or update a key with more allowed actions than the signing key. singingKey allowed actions: ' + String(signingKey?.allowedActions) + '; key add allowed actions: ' + String(k.allowedActions))
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

export const validateKeyUpdatePermissions = (contractID: string, signingKey: GIKey, state: Object, v: GIOpKeyUpdate): [GIKey[], string[]] => {
  const keysToDelete: string[] = []
  const keys = v.map((uk): GIKey => {
    const existingKey = state._vm.authorizedKeys[uk.oldKeyId]
    if (!existingKey) {
      throw new Error('Missing old key ID ' + uk.oldKeyId)
    }
    if (uk.name !== existingKey.name) {
      throw new Error('Name cannot be updated')
    }
    if (!uk.id !== !uk.data) {
      throw new Error('Both or none of the id and data attributes must be provided. Old key ID: ' + uk.oldKeyId)
    }
    if (uk.data && existingKey.meta?.private && !(uk.meta?.private)) {
      throw new Error('Missing private key. Old key ID: ' + uk.oldKeyId)
    }
    if (uk.id) {
      keysToDelete.push(uk.oldKeyId)
    }
    const updatedKey = { ...existingKey }
    // Set the corresponding updated attributes
    if (uk.permissions) {
      updatedKey.permissions = uk.permissions
    }
    if (uk.allowedActions) {
      updatedKey.allowedActions = uk.allowedActions
    }
    if (uk.purpose) {
      updatedKey.purpose = uk.purpose
    }
    if (uk.meta) {
      updatedKey.meta = uk.meta
    }
    if (uk.id) {
      updatedKey.id = uk.id
    }
    if (uk.data) {
      updatedKey.data = uk.data
    }
    return updatedKey
  })
  validateKeyAddPermissions(contractID, signingKey, state, keys)
  return [keys, keysToDelete]
}

export const keyAdditionProcessor = function (keys: GIKey[], state: Object, contractID: string, signingKey: GIKey) {
  console.log('@@@@@ KAP Attempting to decrypt keys for ' + contractID)
  const decryptedKeys = []

  for (const key of keys) {
    let decryptedKey: ?string
    // Does the key have key.meta?.private? If so, attempt to decrypt it
    if (key.meta?.private && key.meta.private.content) {
      if (key.id && key.meta.private.content) {
        try {
          decryptedKey = key.meta.private.content.valueOf()
          decryptedKeys.push([key.id, decryptedKey])
          if (!(key.id in this.config.transientSecretKeys)) {
            this.config.transientSecretKeys[key.id] = deserializeKey(decryptedKey)
          }
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
      const { id, contractID: keyRequestContractID } = key.meta?.keyRequest

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
        rootState[keyRequestContractID]._volatile.pendingKeyRequests.push({ id, name: signingKey.name })

        this.setPostSyncOp(contractID, 'pending-keys-for-' + keyRequestContractID, ['okTurtles.events/emit', CONTRACT_IS_PENDING_KEY_REQUESTS, { contractID: keyRequestContractID }])
      }
    }
  }

  console.log('@@@@@ KAP KL ' + decryptedKeys.length + ' cID ' + contractID)
  if (decryptedKeys.length) {
    if (!state._volatile) this.config.reactiveSet(state, '_volatile', Object.create(null))
    if (!state._volatile.keys) this.config.reactiveSet(state._volatile, 'keys', Object.create(null))

    for (const [id, value] of decryptedKeys) {
      // TODO (Jul 11 2023): Something is probably going wrong here wrt encryptedIncomingData
      console.log('@@@@@ KAP SV ', { ...state._volatile.keys, id, value })
      this.config.reactiveSet(state._volatile.keys, id, value)
    }
  }

  subscribeToForeignKeyContracts.call(this, contractID, state)
}

export const subscribeToForeignKeyContracts = function (contractID: string, state: Object) {
  try {
    // $FlowFixMe[incompatible-call]
    Object.values((state._vm.authorizedKeys: { [x: string]: GIKey })).filter((key) => !!((key: any): GIKey).foreignKey).forEach((key: GIKey) => {
      const foreignKey = String(key.foreignKey)
      const fkUrl = new URL(foreignKey)
      const foreignContract = fkUrl.pathname
      const foreignKeyName = fkUrl.searchParams.get('keyName')

      if (!foreignContract || !foreignKeyName) {
        console.warn('Invalid foreign key: missing contract or key name', { contractID, keyId: key.id })
        return
      }

      const rootState = sbp(this.config.stateSelector)

      const foreignContractState = rootState[foreignContract]

      // Do we have the corresponding private key? If so, add it to this contract
      // This is done here and at syncContractAndWatchKeys
      // The reason for duplicating code is to allow for keys to be available
      // as early as possible
      if (foreignContractState._volatile?.keys?.[key.id]) {
        if (!state._volatile) this.config.reactiveSet(state, '_volatile', Object.create(null))
        if (!state._volatile.keys) this.config.reactiveSet(state._volatile, 'keys', Object.create(null))
        state._volatile.keys[key.id] = foreignContractState._volatile.keys?.[key.id]
      }

      const signingKey = findSuitableSecretKeyId(state, [GIMessage.OP_KEY_DEL], ['sig'], key.ringLevel, Object.keys(this.config.transientSecretKeys))
      const canMirrorOperations = !!signingKey

      // If we cannot mirror operations, then there is nothing left to do
      if (!canMirrorOperations) return

      // If the key is already being watched, do nothing
      if (Array.isArray(rootState?.[foreignContract]?._volatile?.watch)) {
        if (rootState[foreignContract]._volatile.watch.find((v) =>
          v[0] === key.name && v[1] === contractID
        )) return
      }

      this.setPostSyncOp(contractID, `syncAndMirrorKeys-${foreignContract}-${encodeURIComponent(foreignKeyName)}`, ['chelonia/private/in/syncContractAndWatchKeys', foreignContract, foreignKeyName, contractID, key.id])
    })
  } catch (e) {
    console.warn('Error at subscribeToForeignKeyContracts: ' + (e.message || e))
  }
}

// Messages might be sent before receiving already posted messages, which will
// result in a conflict
// When resending a message, race conditions might also occur (for example, if
// key rotation is required and there are many clients simultaneously online, it
// may be performed by all connected clients at once).
// The following function handles re-signing of messages when a conflict
// occurs (required because the message's previousHEAD will change) as well as
// duplicate operations. For operations involving keys, the payload will be
// rewritten to eliminate no-longer-relevant keys. In most cases, this would
// result in an empty payload, in which case the message is omitted entirely.
export const recreateEvent = async (entry: GIMessage, rootState: Object, signatureFn?: Function): Promise<typeof undefined | GIMessage> => {
  const contractID = entry.contractID()
  // We sync the contract to ensure we have the correct local state
  // This way we can fetch new keys and correctly re-sign and re-encrypt
  // messages as needed. This also ensures that we can rewrite (or omit) the
  // payload to remove irrelevant parts.
  // Note that in cases of high contention sync may fail to retrieve the latest
  // state. In such cases, the operation (publishEvent) will fail after the
  // maximum number of attempts is exhausted.
  // Note also that this assumes (and requires) that we are subscribed to a
  // contract before being able to write to it. This is because we rely on the
  // contract state to identify the current keys (in _vm.authorizedKeys) which
  // are used for signatures and for encryption.
  await sbp('chelonia/contract/sync', contractID)
  const previousHEAD = await sbp('chelonia/db/latestHash', contractID)
  const head = entry.head()

  let [opT, opV] = entry.op()
  if (opT === GIMessage.OP_KEY_ADD) {
    const state = rootState[contractID]
    // Has this key already been added? (i.e., present in authorizedKeys)
    opV = (opV: any).filter(({ id }) => !state?._vm.authorizedKeys[id])
    if (opV.length === 0) {
      console.info('Omitting empty OP_KEY_ADD', { head })
      return
    }
  } else if (opT === GIMessage.OP_KEY_DEL) {
    const state = rootState[contractID]
    // Has this key already been removed? (i.e., no longer in authorizedKeys)
    opV = (opV: any).filter((keyId) => !!state?._vm.authorizedKeys[keyId])
    if (opV.length === 0) {
      console.info('Omitting empty OP_KEY_DEL', { head })
      return
    }
  } else if (opT === GIMessage.OP_KEY_UPDATE) {
    const state = rootState[contractID]
    // Has this key already been replaced? (i.e., no longer in authorizedKeys)
    opV = (opV: any).filter(({ oldKeyId }) => !!state?._vm.authorizedKeys[oldKeyId])
    if (opV.length === 0) {
      console.info('Omitting empty OP_KEY_UPDATE', { head })
      return
    }
  }

  entry = GIMessage.cloneWith(head, [opT, opV], { previousHEAD }, signatureFn)

  return entry
}
