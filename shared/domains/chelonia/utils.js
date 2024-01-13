import sbp from '@sbp/sbp'
import { has } from '~/frontend/model/contracts/shared/giLodash.js'
import type { GIKey, GIKeyPurpose, GIKeyUpdate, GIOpActionUnencrypted, GIOpAtomic, GIOpKeyAdd, GIOpKeyUpdate, GIOpValue, ProtoGIOpActionUnencrypted } from './GIMessage.js'
import { GIMessage } from './GIMessage.js'
import { INVITE_STATUS } from './constants.js'
import { deserializeKey } from './crypto.js'
import type { EncryptedData } from './encryptedData.js'
import { unwrapMaybeEncryptedData } from './encryptedData.js'
import { CONTRACT_IS_PENDING_KEY_REQUESTS } from './events.js'
import { ChelErrorWarning } from './errors.js'
import type { SignedData } from './signedData.js'
import { isSignedData } from './signedData.js'

export const findKeyIdByName = (state: Object, name: string): ?string => state._vm?.authorizedKeys && ((Object.values((state._vm.authorizedKeys: any)): any): GIKey[]).find((k) => k.name === name && k._notAfterHeight == null)?.id

export const findForeignKeysByContractID = (state: Object, contractID: string): ?string[] => state._vm?.authorizedKeys && ((Object.values((state._vm.authorizedKeys: any)): any): GIKey[]).filter((k) => k._notAfterHeight == null && k.foreignKey?.includes(contractID)).map(k => k.id)

export const findRevokedKeyIdsByName = (state: Object, name: string): string[] => state._vm?.authorizedKeys && ((Object.values((state._vm.authorizedKeys: any) || {}): any): GIKey[]).filter((k) => k.name === name && k._notAfterHeight != null).map(k => k.id)

export const findSuitableSecretKeyId = (state: Object, permissions: '*' | string[], purposes: GIKeyPurpose[], ringLevel?: number, allowedActions?: '*' | string[]): ?string => {
  return state._vm?.authorizedKeys &&
    ((Object.values((state._vm.authorizedKeys: any)): any): GIKey[])
      .filter((k) => {
        return k._notAfterHeight == null &&
        (k.ringLevel <= (ringLevel ?? Number.POSITIVE_INFINITY)) &&
        sbp('chelonia/haveSecretKey', k.id) &&
        (Array.isArray(permissions)
          ? permissions.reduce((acc, permission) =>
            acc && (k.permissions === '*' || k.permissions.includes(permission)), true
          )
          : permissions === k.permissions
        ) &&
      purposes.reduce((acc, purpose) => acc && k.purpose.includes(purpose), true) &&
      (Array.isArray(allowedActions)
        ? allowedActions.reduce((acc, action) =>
          acc && (k.allowedActions === '*' || k.allowedActions?.includes(action)), true
        )
        : allowedActions ? allowedActions === k.allowedActions : true
      )
      })
      .sort((a, b) => b.ringLevel - a.ringLevel)[0]?.id
}

// TODO: Resolve inviteKey being added (doesn't have krs permission)
export const findSuitablePublicKeyIds = (state: Object, permissions: '*' | string[], purposes: GIKeyPurpose[], ringLevel?: number): ?string[] => {
  return state._vm?.authorizedKeys &&
    ((Object.values((state._vm.authorizedKeys: any)): any): GIKey[]).filter((k) =>
      (k._notAfterHeight == null) &&
      (k.ringLevel <= (ringLevel ?? Number.POSITIVE_INFINITY)) &&
      (Array.isArray(permissions)
        ? permissions.reduce((acc, permission) => acc && (k.permissions === '*' || k.permissions.includes(permission)), true)
        : permissions === k.permissions
      ) &&
      purposes.reduce((acc, purpose) => acc && k.purpose.includes(purpose), true))
      .sort((a, b) => b.ringLevel - a.ringLevel)
      .map((k) => k.id)
}

const validateActionPermissions = (signingKey: GIKey, state: Object, opT: string, opV: GIOpActionUnencrypted) => {
  const data: ProtoGIOpActionUnencrypted = isSignedData(opV)
    ? (opV: any).valueOf()
    : (opV: any)

  if (
    signingKey.allowedActions !== '*' && (
      !Array.isArray(signingKey.allowedActions) ||
      !signingKey.allowedActions.includes(data.action)
    )
  ) {
    console.error(`Signing key ${signingKey.id} is not allowed for action ${data.action}`)
    return false
  }

  if (isSignedData(opV)) {
    const s = ((opV: any): SignedData<void>)
    const innerSigningKey = state._vm?.authorizedKeys?.[s.signingKeyId]

    if (
      !innerSigningKey ||
      !Array.isArray(innerSigningKey.purpose) ||
        !innerSigningKey.purpose.includes('sig') ||
        (innerSigningKey.permissions !== '*' &&
          (
            !Array.isArray(innerSigningKey.permissions) ||
            !innerSigningKey.permissions.includes(opT + '#inner')
          )
        )
    ) {
      console.error(`Signing key ${innerSigningKey.id} is missing permissions for operation ${opT}`)
      return false
    }

    if (
      innerSigningKey.allowedActions !== '*' && (
        !Array.isArray(innerSigningKey.allowedActions) ||
        !innerSigningKey.allowedActions.includes(data.action + '#inner')
      )
    ) {
      console.error(`Signing key ${innerSigningKey.id} is not allowed for action ${data.action}`)
      return false
    }
  }

  return true
}

export const validateKeyPermissions = (state: Object, signingKeyId: string, opT: string, opV: GIOpValue): boolean => {
  const signingKey = state._vm?.authorizedKeys?.[signingKeyId]
  if (
    !signingKey ||
    !Array.isArray(signingKey.purpose) ||
      !signingKey.purpose.includes('sig') ||
      (signingKey.permissions !== '*' &&
        (
          !Array.isArray(signingKey.permissions) ||
          !signingKey.permissions.includes(opT)
        )
      )
  ) {
    console.error(`Signing key ${signingKey.id} is missing permissions for operation ${opT}`)
    return false
  }

  if (
    opT === GIMessage.OP_ACTION_UNENCRYPTED &&
    !validateActionPermissions(signingKey, state, opT, (opV: any))
  ) {
    return false
  }

  if (
    opT === GIMessage.OP_ACTION_ENCRYPTED &&
    !validateActionPermissions(signingKey, state, opT, (opV: any).valueOf())
  ) {
    return false
  }

  return true
}

export const validateKeyAddPermissions = (contractID: string, signingKey: GIKey, state: Object, v: (GIKey | EncryptedData<GIKey>)[], skipPrivateCheck?: boolean) => {
  const signingKeyPermissions = Array.isArray(signingKey.permissions) ? new Set(signingKey.permissions) : signingKey.permissions
  const signingKeyAllowedActions = Array.isArray(signingKey.allowedActions) ? new Set(signingKey.allowedActions) : signingKey.allowedActions
  if (!state._vm?.authorizedKeys?.[signingKey.id]) throw new Error('Singing key for OP_KEY_ADD or OP_KEY_UPDATE must exist in _vm.authorizedKeys. contractID=' + contractID + ' signingKeyId=' + signingKey.id)
  const localSigningKey = state._vm.authorizedKeys[signingKey.id]
  v.forEach(wk => {
    const data = unwrapMaybeEncryptedData(wk)
    if (!data) return
    const k = (data.data: GIKey)
    if (!skipPrivateCheck && signingKey._private && !data.encryptionKeyId) {
      throw new Error('Signing key is private but it tried adding a public key')
    }
    if (!Number.isSafeInteger(k.ringLevel) || k.ringLevel < localSigningKey.ringLevel) {
      throw new Error('Signing key has ringLevel ' + localSigningKey.ringLevel + ' but attempted to add or update a key with ringLevel ' + k.ringLevel)
    }
    if (signingKeyPermissions !== '*') {
      if (!Array.isArray(k.permissions) || !k.permissions.reduce((acc, cv) => acc && signingKeyPermissions.has(cv), true)) {
        throw new Error('Unable to add or update a key with more permissions than the signing key. signingKey permissions: ' + String(signingKey?.permissions) + '; key add permissions: ' + String(k.permissions))
      }
    }
    if (signingKeyAllowedActions !== '*' && k.allowedActions) {
      if (!signingKeyAllowedActions || !Array.isArray(k.allowedActions) || !k.allowedActions.reduce((acc, cv) => acc && signingKeyAllowedActions.has(cv), true)) {
        throw new Error('Unable to add or update a key with more allowed actions than the signing key. signingKey allowed actions: ' + String(signingKey?.allowedActions) + '; key add allowed actions: ' + String(k.allowedActions))
      }
    }
  })
}

export const validateKeyDelPermissions = (contractID: string, signingKey: GIKey, state: Object, v: (string | EncryptedData<string>)[]) => {
  if (!state._vm?.authorizedKeys?.[signingKey.id]) throw new Error('Singing key for OP_KEY_DEL must exist in _vm.authorizedKeys. contractID=' + contractID + ' signingKeyId=' + signingKey.id)
  const localSigningKey = state._vm.authorizedKeys[signingKey.id]
  v
    .forEach((wid) => {
      const data = unwrapMaybeEncryptedData(wid)
      if (!data) return
      const id = data.data
      const k = state._vm.authorizedKeys[id]
      if (!k) {
        throw new Error('Nonexisting key ID ' + id)
      }
      if (signingKey._private) {
        throw new Error('Signing key is private')
      }
      if (!k._private !== !data.encryptionKeyId) {
        throw new Error('_private attribute must be preserved')
      }
      if (!Number.isSafeInteger(k.ringLevel) || k.ringLevel < localSigningKey.ringLevel) {
        throw new Error('Signing key has ringLevel ' + localSigningKey.ringLevel + ' but attempted to remove a key with ringLevel ' + k.ringLevel)
      }
    })
}

export const validateKeyUpdatePermissions = (contractID: string, signingKey: GIKey, state: Object, v: (GIKeyUpdate | EncryptedData<GIKeyUpdate>)[]): [GIKey[], { [k: string]: string }] => {
  const updatedMap = ((Object.create(null): any): { [k: string]: string })
  const keys = v.map((wuk): GIKey | void => {
    const data = unwrapMaybeEncryptedData(wuk)
    if (!data) return undefined
    const uk = (data.data: GIKeyUpdate)

    const existingKey = state._vm.authorizedKeys[uk.oldKeyId]
    if (!existingKey) {
      throw new ChelErrorWarning('Missing old key ID ' + uk.oldKeyId)
    }
    if (!existingKey._private !== !data.encryptionKeyId) {
      throw new Error('_private attribute must be preserved')
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
    if (uk.id && uk.id !== uk.oldKeyId) {
      updatedMap[uk.id] = uk.oldKeyId
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
  }).filter(Boolean)
  validateKeyAddPermissions(contractID, signingKey, state, keys, true)
  return [((keys: any): GIKey[]), updatedMap]
}

export const keyAdditionProcessor = function (hash: string, keys: (GIKey | EncryptedData<GIKey>)[], state: Object, contractID: string, signingKey: GIKey) {
  const decryptedKeys = []

  for (const wkey of keys) {
    const data = unwrapMaybeEncryptedData(wkey)
    if (!data) continue
    const key = data.data
    let decryptedKey: ?string
    // Does the key have key.meta?.private? If so, attempt to decrypt it
    if (key.meta?.private && key.meta.private.content) {
      if (
        key.id &&
        key.meta.private.content &&
        !sbp('chelonia/haveSecretKey', key.id, !key.meta.private.transient)
      ) {
        try {
          decryptedKey = key.meta.private.content.valueOf()
          decryptedKeys.push([key.id, decryptedKey])
          sbp('chelonia/storeSecretKeys', () => [{
            key: deserializeKey(decryptedKey),
            transient: !!key.meta.private.transient
          }])
        } catch (e) {
          console.warn(`Secret key decryption error '${e.message || e}':`, e)
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
        inviteSecret: decryptedKey || this.transientSecretKeys[key.id],
        responses: []
      })
    }

    // Is this KEY operation the result of requesting keys for another contract?
    if (key.meta?.keyRequest?.contractID && findSuitableSecretKeyId(state, [GIMessage.OP_KEY_ADD], ['sig'])) {
      const data = unwrapMaybeEncryptedData(key.meta.keyRequest.contractID)

      // Are we subscribed to this contract?
      // If we are not subscribed to the contract, we don't set pendingKeyRequests because we don't need that contract's state
      // Setting pendingKeyRequests in these cases could result in issues
      // when a corresponding OP_KEY_SHARE is received, which could trigger subscribing to this previously unsubscribed to contract
      if (data) {
        const keyRequestContractID = data.data
        const reference = key.meta.keyRequest.reference && unwrapMaybeEncryptedData(key.meta.keyRequest.reference)

        // Since now we'll make changes to keyRequestContractID, we need to
        // do this while no other operations are running for that
        // contract
        sbp('chelonia/private/queueEvent', keyRequestContractID, () => {
          const rootState = sbp(this.config.stateSelector)

          const originatingContractState = rootState[contractID]
          if (sbp('chelonia/contract/hasKeyShareBeenRespondedBy', originatingContractState, keyRequestContractID, reference)) {
            // In the meantime, our key request has been responded, so we
            // don't need to set pendingKeyRequests.
            return
          }

          if (!has(rootState, keyRequestContractID)) this.config.reactiveSet(rootState, keyRequestContractID, Object.create(null))
          const targetState = rootState[keyRequestContractID]

          if (!targetState._volatile) {
            this.config.reactiveSet(targetState, '_volatile', Object.create(null))
          }
          if (!targetState._volatile.pendingKeyRequests) {
            this.config.reactiveSet(rootState[keyRequestContractID]._volatile, 'pendingKeyRequests', [])
          }

          if (targetState._volatile.pendingKeyRequests.some((pkr) => {
            return pkr && pkr.contractID === contractID && pkr.hash === hash
          })) {
            // This pending key request has already been registered.
            // Nothing left to do.
            return
          }

          // Mark the contract for which keys were requested as pending keys
          // The hash (of the current message) is added to this dictionary
          // for cross-referencing puposes.
          targetState._volatile.pendingKeyRequests.push({ contractID, name: key.name, hash, reference: reference?.data })

          this.setPostSyncOp(contractID, 'pending-keys-for-' + keyRequestContractID, ['okTurtles.events/emit', CONTRACT_IS_PENDING_KEY_REQUESTS, { contractID: keyRequestContractID }])
        }).catch((e) => {
          console.error('Error while setting or updating pendingKeyRequests', { contractID, keyRequestContractID, reference }, e)
        })
      }
    }
  }

  subscribeToForeignKeyContracts.call(this, contractID, state)
}

export const subscribeToForeignKeyContracts = function (contractID: string, state: Object) {
  try {
    // $FlowFixMe[incompatible-call]
    Object.values((state._vm.authorizedKeys: { [x: string]: GIKey })).filter((key) => !!((key: any): GIKey).foreignKey && findKeyIdByName(state, ((key: any): GIKey).name) != null).forEach((key: GIKey) => {
      const foreignKey = String(key.foreignKey)
      const fkUrl = new URL(foreignKey)
      const foreignContract = fkUrl.pathname
      const foreignKeyName = fkUrl.searchParams.get('keyName')

      if (!foreignContract || !foreignKeyName) {
        console.warn('Invalid foreign key: missing contract or key name', { contractID, keyId: key.id })
        return
      }

      const rootState = sbp(this.config.stateSelector)

      const signingKey = findSuitableSecretKeyId(state, [GIMessage.OP_KEY_DEL], ['sig'], key.ringLevel)
      const canMirrorOperations = !!signingKey

      // If we cannot mirror operations, then there is nothing left to do
      if (!canMirrorOperations) return

      // If the key is already being watched, do nothing
      if (Array.isArray(rootState?.[foreignContract]?._volatile?.watch)) {
        if (rootState[foreignContract]._volatile.watch.find((v) =>
          v[0] === key.name && v[1] === contractID
        )) return
      }

      if (!has(state._vm, 'pendingWatch')) this.config.reactiveSet(state._vm, 'pendingWatch', Object.create(null))
      if (!has(state._vm.pendingWatch, foreignContract)) this.config.reactiveSet(state._vm.pendingWatch, foreignContract, [])
      if (!state._vm.pendingWatch[foreignContract].includes(foreignKeyName)) {
        state._vm.pendingWatch[foreignContract].push([foreignKeyName, key.id])
      }

      this.setPostSyncOp(contractID, `watchForeignKeys-${contractID}`, ['chelonia/private/watchForeignKeys', contractID])
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
export const recreateEvent = (entry: GIMessage, state: Object, contractsState: Object): typeof undefined | GIMessage => {
  const { HEAD: previousHEAD, height: previousHeight } = contractsState || {}
  if (!previousHEAD) {
    throw new Error('recreateEvent: Giving up because the contract has been removed')
  }
  const head = entry.head()

  const [opT, rawOpV] = entry.rawOp()

  const recreateOperation = (opT: string, rawOpV: SignedData<GIOpValue>) => {
    const opV = rawOpV.valueOf()
    const recreateOperationInternal = (opT: string, opV: GIOpValue): GIOpValue | typeof undefined => {
      let newOpV: GIOpValue
      if (opT === GIMessage.OP_KEY_ADD) {
        if (!Array.isArray(opV)) throw new Error('Invalid message format')
        newOpV = ((opV: any): GIOpKeyAdd).filter((k) => {
          const kId = (k.valueOf(): any).id
          return !has(state._vm.authorizedKeys, kId) || state._vm.authorizedKeys[kId]._notAfterHeight != null
        })
        // Has this key already been added? (i.e., present in authorizedKeys)
        if (newOpV.length === 0) {
          console.info('Omitting empty OP_KEY_ADD', { head })
        } else if (newOpV.length === opV.length) {
          return opV
        }
      } else if (opT === GIMessage.OP_KEY_DEL) {
        if (!Array.isArray(opV)) throw new Error('Invalid message format')
        // Has this key already been removed? (i.e., no longer in authorizedKeys)
        newOpV = opV.filter((keyId) => {
          const kId = (Object(keyId).valueOf(): any)
          return has(state._vm.authorizedKeys, kId) && state._vm.authorizedKeys[kId]._notAfterHeight == null
        })
        if (newOpV.length === 0) {
          console.info('Omitting empty OP_KEY_DEL', { head })
        } else if (newOpV.length === opV.length) {
          return opV
        }
      } else if (opT === GIMessage.OP_KEY_UPDATE) {
        if (!Array.isArray(opV)) throw new Error('Invalid message format')
        // Has this key already been replaced? (i.e., no longer in authorizedKeys)
        newOpV = ((opV: any): GIOpKeyUpdate).filter((k) => {
          const oKId = (k.valueOf(): any).oldKeyId
          const nKId = (k.valueOf(): any).id
          return nKId == null || (has(state._vm.authorizedKeys, oKId) && state._vm.authorizedKeys[oKId]._notAfterHeight == null)
        })
        if (newOpV.length === 0) {
          console.info('Omitting empty OP_KEY_UPDATE', { head })
        } else if (newOpV.length === opV.length) {
          return opV
        }
      } else if (opT === GIMessage.OP_ATOMIC) {
        if (!Array.isArray(opV)) throw new Error('Invalid message format')
        newOpV = ((((opV: any): GIOpAtomic).map(([t, v]) => [t, recreateOperationInternal(t, v)]).filter(([, v]) => !!v): any): GIOpAtomic)
        if (newOpV.length === 0) {
          console.info('Omitting empty OP_ATOMIC', { head })
        } else if (newOpV.length === opV.length && newOpV.reduce((acc, cv, i) => acc && cv === opV[i], true)) {
          return opV
        } else {
          return newOpV
        }
      } else {
        return opV
      }
    }

    const newOpV = recreateOperationInternal(opT, opV)

    if (newOpV === opV) {
      return rawOpV
    } else if (newOpV === undefined) {
      return
    }

    if (typeof rawOpV.recreate !== 'function') {
      throw new Error('Unable to recreate operation')
    }

    return rawOpV.recreate(newOpV)
  }

  const newRawOpV = recreateOperation(opT, rawOpV)

  if (!newRawOpV) return

  const newOp = [opT, newRawOpV]

  entry = GIMessage.cloneWith(
    head, newOp, { previousHEAD, height: previousHeight + 1 }
  )

  return entry
}
