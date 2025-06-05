import sbp from '@sbp/sbp'
import { has, omit } from 'turtledash'
import { b64ToStr } from '~/shared/functions.js'
import type { SPKey, SPKeyPurpose, SPKeyUpdate, SPOpActionUnencrypted, SPOpAtomic, SPOpKeyAdd, SPOpKeyUpdate, SPOpValue, ProtoSPOpActionUnencrypted } from './SPMessage.js'
import { SPMessage } from './SPMessage.js'
import { Secret } from './Secret.js'
import { INVITE_STATUS } from './constants.js'
import { deserializeKey, serializeKey, sign, verifySignature } from '@chelonia/crypto'
import type { EncryptedData } from './encryptedData.js'
import { ChelErrorForkedChain, ChelErrorResourceGone, ChelErrorUnexpectedHttpResponseCode, ChelErrorWarning } from './errors.js'
import { CONTRACT_IS_PENDING_KEY_REQUESTS } from './events.js'
import type { SignedData } from './signedData.js'
import { isSignedData } from './signedData.js'

const MAX_EVENTS_AFTER = Number.parseInt(process.env.MAX_EVENTS_AFTER || '', 10) || Infinity

export const findKeyIdByName = (state: Object, name: string): ?string => state._vm?.authorizedKeys && ((Object.values((state._vm.authorizedKeys: any)): any): SPKey[]).find((k) => k.name === name && k._notAfterHeight == null)?.id

export const findForeignKeysByContractID = (state: Object, contractID: string): ?string[] => state._vm?.authorizedKeys && ((Object.values((state._vm.authorizedKeys: any)): any): SPKey[]).filter((k) => k._notAfterHeight == null && k.foreignKey?.includes(contractID)).map(k => k.id)

export const findRevokedKeyIdsByName = (state: Object, name: string): string[] => state._vm?.authorizedKeys && ((Object.values((state._vm.authorizedKeys: any) || {}): any): SPKey[]).filter((k) => k.name === name && k._notAfterHeight != null).map(k => k.id)

export const findSuitableSecretKeyId = (state: Object, permissions: '*' | string[], purposes: SPKeyPurpose[], ringLevel?: number, allowedActions?: '*' | string[]): ?string => {
  return state._vm?.authorizedKeys &&
    ((Object.values((state._vm.authorizedKeys: any)): any): SPKey[])
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
          acc && (k.allowedActions === '*' || !!k.allowedActions?.includes(action)), true
        )
        : allowedActions ? allowedActions === k.allowedActions : true
      )
      })
      .sort((a, b) => b.ringLevel - a.ringLevel)[0]?.id
}

export const findContractIDByForeignKeyId = (state: Object, keyId: string): ?string => {
  if (!keyId || !state?._vm?.authorizedKeys?.[keyId]?.foreignKey) return

  try {
    const fkUrl = new URL(state._vm.authorizedKeys[keyId].foreignKey)
    return fkUrl.pathname
  } catch {}
}

// TODO: Resolve inviteKey being added (doesn't have krs permission)
export const findSuitablePublicKeyIds = (state: Object, permissions: '*' | string[], purposes: SPKeyPurpose[], ringLevel?: number): ?string[] => {
  return state._vm?.authorizedKeys &&
    ((Object.values((state._vm.authorizedKeys: any)): any): SPKey[]).filter((k) =>
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

const validateActionPermissions = (msg: SPMessage, signingKey: SPKey, state: Object, opT: string, opV: SPOpActionUnencrypted) => {
  const data: ProtoSPOpActionUnencrypted = isSignedData(opV)
    ? (opV: any).valueOf()
    : (opV: any)

  if (
    signingKey.allowedActions !== '*' && (
      !Array.isArray(signingKey.allowedActions) ||
      !signingKey.allowedActions.includes(data.action)
    )
  ) {
    logEvtError(msg, `Signing key ${signingKey.id} is not allowed for action ${data.action}`)
    return false
  }

  if (isSignedData(opV)) {
    const s = ((opV: any): SignedData<void>)
    const innerSigningKey = state._vm?.authorizedKeys?.[s.signingKeyId]

    // For outgoing messages, we may be using an inner signing key that isn't
    // available for us to see. In this case, we ignore the missing key.
    // For incoming messages, we must check permissions and a missing
    // key means no permissions.
    if (!innerSigningKey && msg._direction === 'outgoing') return true

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
      logEvtError(msg, `Signing key ${s.signingKeyId} is missing permissions for operation ${opT}`)
      return false
    }

    if (
      innerSigningKey.allowedActions !== '*' && (
        !Array.isArray(innerSigningKey.allowedActions) ||
        !innerSigningKey.allowedActions.includes(data.action + '#inner')
      )
    ) {
      logEvtError(msg, `Signing key ${innerSigningKey.id} is not allowed for action ${data.action}`)
      return false
    }
  }

  return true
}

export const validateKeyPermissions = (msg: SPMessage, config: Object, state: Object, signingKeyId: string, opT: string, opV: SPOpValue): boolean => {
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
    logEvtError(msg, `Signing key ${signingKeyId} is missing permissions for operation ${opT}`)
    return false
  }

  if (
    opT === SPMessage.OP_ACTION_UNENCRYPTED &&
    !validateActionPermissions(msg, signingKey, state, opT, (opV: any))
  ) {
    return false
  }

  if (
    !config.skipActionProcessing &&
    opT === SPMessage.OP_ACTION_ENCRYPTED &&
    !validateActionPermissions(msg, signingKey, state, opT, (opV: any).valueOf())
  ) {
    return false
  }

  return true
}

export const validateKeyAddPermissions = function (contractID: string, signingKey: SPKey, state: Object, v: (SPKey | EncryptedData<SPKey>)[], skipPrivateCheck?: boolean) {
  const signingKeyPermissions = Array.isArray(signingKey.permissions) ? new Set(signingKey.permissions) : signingKey.permissions
  const signingKeyAllowedActions = Array.isArray(signingKey.allowedActions) ? new Set(signingKey.allowedActions) : signingKey.allowedActions
  if (!state._vm?.authorizedKeys?.[signingKey.id]) throw new Error('Singing key for OP_KEY_ADD or OP_KEY_UPDATE must exist in _vm.authorizedKeys. contractID=' + contractID + ' signingKeyId=' + signingKey.id)
  const localSigningKey = state._vm.authorizedKeys[signingKey.id]
  v.forEach(wk => {
    // $FlowFixMe[prop-missing]
    const data = this.config.unwrapMaybeEncryptedData(wk)
    if (!data) return
    const k = (data.data: SPKey)
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

export const validateKeyDelPermissions = function (contractID: string, signingKey: SPKey, state: Object, v: (string | EncryptedData<string>)[]) {
  if (!state._vm?.authorizedKeys?.[signingKey.id]) throw new Error('Singing key for OP_KEY_DEL must exist in _vm.authorizedKeys. contractID=' + contractID + ' signingKeyId=' + signingKey.id)
  const localSigningKey = state._vm.authorizedKeys[signingKey.id]
  v
    .forEach((wid) => {
      const data = this.config.unwrapMaybeEncryptedData(wid)
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

export const validateKeyUpdatePermissions = function (contractID: string, signingKey: SPKey, state: Object, v: (SPKeyUpdate | EncryptedData<SPKeyUpdate>)[]): [SPKey[], { [k: string]: string }] {
  const updatedMap = ((Object.create(null): any): { [k: string]: string })
  const keys = v.map((wuk): SPKey | void => {
    const data = this.config.unwrapMaybeEncryptedData(wuk)
    if (!data) return undefined
    const uk = (data.data: SPKeyUpdate)

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
    // Discard `_notAfterHeight` and `_notBeforeHeight`, since retaining them
    // can cause issues reprocessing messages.
    // An example is reprocessing old messages in a chatroom using
    // `chelonia/in/processMessage`: cloning `_notAfterHeight` will break key
    // rotations, since the new key will have the same expiration value as the
    // old key (the new key is supposed to have no expiration height).
    const updatedKey = omit(existingKey, ['_notAfterHeight', '_notBeforeHeight'])
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
  validateKeyAddPermissions.call(this, contractID, signingKey, state, keys, true)
  return [((keys: any): SPKey[]), updatedMap]
}

export const keyAdditionProcessor = function (_msg: SPMessage, hash: string, keys: (SPKey | EncryptedData<SPKey>)[], state: Object, contractID: string, _signingKey: SPKey, internalSideEffectStack?: Function[]) {
  const decryptedKeys = []
  const keysToPersist = []

  const storeSecretKey = (key, decryptedKey) => {
    const decryptedDeserializedKey = deserializeKey(decryptedKey)
    const transient = !!key.meta?.private?.transient
    sbp('chelonia/storeSecretKeys', new Secret([{
      key: decryptedDeserializedKey,
      // We always set this to true because this could be done from
      // an outgoing message
      transient: true
    }]))
    if (!transient) {
      keysToPersist.push({ key: decryptedDeserializedKey, transient })
    }
  }

  for (const wkey of keys) {
    const data = this.config.unwrapMaybeEncryptedData(wkey)
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
        const decryptedKeyResult = this.config.unwrapMaybeEncryptedData(key.meta.private.content)
        // Ignore data that couldn't be decrypted
        if (decryptedKeyResult) {
        // Data aren't encrypted
          if (decryptedKeyResult.encryptionKeyId == null) {
            throw new Error('Expected encrypted data but got unencrypted data for key with ID: ' + key.id)
          }
          decryptedKey = decryptedKeyResult.data
          decryptedKeys.push([key.id, decryptedKey])
          storeSecretKey(key, decryptedKey)
        }
      }
    }

    // Is this a #sak
    if (key.name === '#sak') {
      if (data.encryptionKeyId) {
        throw new Error('#sak may not be encrypted')
      }
      if (key.permissions && (!Array.isArray(key.permissions) || key.permissions.length !== 0)) {
        throw new Error('#sak may not have permissions')
      }
      if (!Array.isArray(key.purpose) || key.purpose.length !== 1 || key.purpose[0] !== 'sak') {
        throw new Error("#sak must have exactly one purpose: 'sak'")
      }
      if (key.ringLevel !== 0) {
        throw new Error('#sak must have ringLevel 0')
      }
    }

    // Is this a an invite key? If so, run logic for invite keys and invitation
    // accounting
    if (key.name.startsWith('#inviteKey-')) {
      if (!state._vm.invites) state._vm.invites = Object.create(null)
      const inviteSecret = decryptedKey || (
        has(this.transientSecretKeys, key.id)
          ? serializeKey(this.transientSecretKeys[key.id], true)
          : undefined
      )
      state._vm.invites[key.id] = {
        status: INVITE_STATUS.VALID,
        initialQuantity: key.meta.quantity,
        quantity: key.meta.quantity,
        expires: key.meta.expires,
        inviteSecret,
        responses: []
      }
    }

    // Is this KEY operation the result of requesting keys for another contract?
    if (key.meta?.keyRequest?.contractID && findSuitableSecretKeyId(state, [SPMessage.OP_KEY_ADD], ['sig'])) {
      const data = this.config.unwrapMaybeEncryptedData(key.meta.keyRequest.contractID)

      // Are we subscribed to this contract?
      // If we are not subscribed to the contract, we don't set pendingKeyRequests because we don't need that contract's state
      // Setting pendingKeyRequests in these cases could result in issues
      // when a corresponding OP_KEY_SHARE is received, which could trigger subscribing to this previously unsubscribed to contract
      if (data && internalSideEffectStack) {
        const keyRequestContractID = data.data
        const reference = this.config.unwrapMaybeEncryptedData(key.meta.keyRequest.reference)

        // Since now we'll make changes to keyRequestContractID, we need to
        // do this while no other operations are running for that
        // contract
        internalSideEffectStack.push(() => {
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
            // Using console.error instead of logEvtError because this
            // is a side-effect and not relevant for outgoing messages
            console.error('Error while setting or updating pendingKeyRequests', { contractID, keyRequestContractID, reference }, e)
          })
        })
      }
    }
  }

  // Any persistent keys are stored as a side-effect
  if (keysToPersist.length) {
    internalSideEffectStack?.push(() => {
      sbp('chelonia/storeSecretKeys', new Secret(keysToPersist))
    })
  }
  internalSideEffectStack?.push(() => subscribeToForeignKeyContracts.call(this, contractID, state))
}

export const subscribeToForeignKeyContracts = function (contractID: string, state: Object) {
  try {
    // $FlowFixMe[incompatible-call]
    Object.values((state._vm.authorizedKeys: { [x: string]: SPKey })).filter((key) => !!((key: any): SPKey).foreignKey && findKeyIdByName(state, ((key: any): SPKey).name) != null).forEach((key: SPKey) => {
      const foreignKey = String(key.foreignKey)
      const fkUrl = new URL(foreignKey)
      const foreignContract = fkUrl.pathname
      const foreignKeyName = fkUrl.searchParams.get('keyName')

      if (!foreignContract || !foreignKeyName) {
        console.warn('Invalid foreign key: missing contract or key name', { contractID, keyId: key.id })
        return
      }

      const rootState = sbp(this.config.stateSelector)

      const signingKey = findSuitableSecretKeyId(state, [SPMessage.OP_KEY_DEL], ['sig'], key.ringLevel)
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
      if (!state._vm.pendingWatch[foreignContract].find(([n]) => n === foreignKeyName)) {
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
export const recreateEvent = (entry: SPMessage, state: Object, contractsState: Object): typeof undefined | SPMessage => {
  const { HEAD: previousHEAD, height: previousHeight, previousKeyOp } = contractsState || {}
  if (!previousHEAD) {
    throw new Error('recreateEvent: Giving up because the contract has been removed')
  }
  const head = entry.head()

  const [opT, rawOpV] = entry.rawOp()

  const recreateOperation = (opT: string, rawOpV: SignedData<SPOpValue>) => {
    const opV = rawOpV.valueOf()
    const recreateOperationInternal = (opT: string, opV: SPOpValue): SPOpValue | typeof undefined => {
      let newOpV: SPOpValue
      if (opT === SPMessage.OP_KEY_ADD) {
        if (!Array.isArray(opV)) throw new Error('Invalid message format')
        newOpV = ((opV: any): SPOpKeyAdd).filter((k) => {
          const kId = (k.valueOf(): any).id
          return !has(state._vm.authorizedKeys, kId) || state._vm.authorizedKeys[kId]._notAfterHeight != null
        })
        // Has this key already been added? (i.e., present in authorizedKeys)
        if (newOpV.length === 0) {
          console.info('Omitting empty OP_KEY_ADD', { head })
        } else if (newOpV.length === opV.length) {
          return opV
        }
      } else if (opT === SPMessage.OP_KEY_DEL) {
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
      } else if (opT === SPMessage.OP_KEY_UPDATE) {
        if (!Array.isArray(opV)) throw new Error('Invalid message format')
        // Has this key already been replaced? (i.e., no longer in authorizedKeys)
        newOpV = ((opV: any): SPOpKeyUpdate).filter((k) => {
          const oKId = (k.valueOf(): any).oldKeyId
          const nKId = (k.valueOf(): any).id
          return nKId == null || (has(state._vm.authorizedKeys, oKId) && state._vm.authorizedKeys[oKId]._notAfterHeight == null)
        })
        if (newOpV.length === 0) {
          console.info('Omitting empty OP_KEY_UPDATE', { head })
        } else if (newOpV.length === opV.length) {
          return opV
        }
      } else if (opT === SPMessage.OP_ATOMIC) {
        if (!Array.isArray(opV)) throw new Error('Invalid message format')
        newOpV = ((((opV: any): SPOpAtomic).map(([t, v]) => [t, recreateOperationInternal(t, v)]).filter(([, v]) => !!v): any): SPOpAtomic)
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

  entry = SPMessage.cloneWith(
    head, newOp, { previousKeyOp, previousHEAD, height: previousHeight + 1 }
  )

  return entry
}

export const getContractIDfromKeyId = (contractID: string, signingKeyId: ?string, state: Object): ?string => {
  if (!signingKeyId) return
  return signingKeyId && state._vm?.authorizedKeys?.[signingKeyId]?.foreignKey
    ? new URL(state._vm.authorizedKeys[signingKeyId].foreignKey).pathname
    : contractID
}

export function eventsAfter (contractID: string, sinceHeight: number, limit?: number, sinceHash?: string, { stream }: { stream: boolean } = { stream: true }): ReadableStream | Promise<any[]> {
  if (!contractID) {
    // Avoid making a network roundtrip to tell us what we already know
    throw new Error('Missing contract ID')
  }

  let lastUrl
  const fetchEventsStreamReader = async () => {
    requestLimit = Math.min(limit ?? MAX_EVENTS_AFTER, remainingEvents)
    lastUrl = `${this.config.connectionURL}/eventsAfter/${contractID}/${sinceHeight}${Number.isInteger(requestLimit) ? `/${requestLimit}` : ''}`
    const eventsResponse = await this.config.fetch(lastUrl, { signal })
    if (!eventsResponse.ok) {
      const msg = `${eventsResponse.status}: ${eventsResponse.statusText}`
      // $FlowFixMe[extra-arg]
      if (eventsResponse.status === 404 || eventsResponse.status === 410) throw new ChelErrorResourceGone(msg, { cause: eventsResponse.status })
      // $FlowFixMe[extra-arg]
      throw new ChelErrorUnexpectedHttpResponseCode(msg, { cause: eventsResponse.status })
    }
    if (!eventsResponse.body) throw new Error('Missing body')
    latestHeight = parseInt(eventsResponse.headers.get('shelter-headinfo-height'), 10)
    if (!Number.isSafeInteger(latestHeight)) throw new Error('Invalid latest height')
    requestCount++
    // $FlowFixMe[incompatible-use]
    return eventsResponse.body.getReader()
  }
  if (!Number.isSafeInteger(sinceHeight) || sinceHeight < 0) {
    throw new TypeError('Invalid since height value. Expected positive integer.')
  }
  const signal = this.abortController.signal
  let requestCount = 0
  let remainingEvents = limit ?? Number.POSITIVE_INFINITY
  let eventsStreamReader
  let latestHeight
  let state: 'fetch' | 'read-eos' | 'read-new-response' | 'read' | 'events' | 'eod' = 'fetch'
  let requestLimit: number
  let count: number
  let buffer: string = ''
  let currentEvent: string
  // return ReadableStream with a custom pull function to handle streamed data
  const s = new ReadableStream({
    // The pull function is called whenever the internal buffer of the stream
    // becomes empty and needs more data.
    async pull (controller) {
      try {
        for (;;) {
        // Handle different states of the stream reading process.
          switch (state) {
          // When in 'fetch' state, initiate a new fetch request to obtain a
          // stream reader for events.
            case 'fetch': {
              eventsStreamReader = await fetchEventsStreamReader()
              // Transition to reading the new response and reset the processed
              // events counter
              state = 'read-new-response'
              count = 0
              break
            }
            case 'read-eos': // End of stream case
            case 'read-new-response': // Just started reading a new response
            case 'read': { // Reading from the response stream
              const { done, value } = await eventsStreamReader.read()
              // If done, determine if the stream should close or fetch more
              // data by making a new request
              if (done) {
              // No more events to process or reached the latest event
              // Using `>=` instead of `===` to avoid an infinite loop in the
              // event of data loss on the server.
                if (remainingEvents === 0 || sinceHeight >= latestHeight) {
                  controller.close()
                  return
                } else if (state === 'read-new-response' || buffer) {
                // If done prematurely, throw an error
                  throw new Error('Invalid response: done too early')
                } else {
                // If there are still events to fetch, switch state to fetch
                  state = 'fetch'
                  break
                }
              }
              if (!value) {
              // If there's no value (e.g., empty response), throw an error
                throw new Error('Invalid response: missing body')
              }
              // Concatenate new data to the buffer, trimming any
              // leading/trailing whitespace (the response is a JSON array of
              // base64-encoded data, meaning that whitespace is not significant)
              buffer = buffer + Buffer.from(value).toString().trim()
              // If there was only whitespace, try reading again
              if (!buffer) break
              if (state === 'read-new-response') {
              // Response is in JSON format, so we look for the start of an
              // array (`[`)
                if (buffer[0] !== '[') {
                  throw new Error('Invalid response: no array start delimiter')
                }
                // Trim the array start delimiter from the buffer
                buffer = buffer.slice(1)
              } else if (state === 'read-eos') {
              // If in 'read-eos' state and still reading data, it's an error
              // because the response isn't valid JSON (there should be
              // nothing other than whitespace after `]`)
                throw new Error('Invalid data at the end of response')
              }
              // If not handling new response or end-of-stream, switch to
              // processing events
              state = 'events'
              break
            }
            case 'events': {
            // Process events by looking for a comma or closing bracket that
            // indicates the end of an event
              const nextIdx = buffer.search(/(?<=\s*)[,\]]/)
              // If the end of the event isn't found, go back to reading more
              // data
              if (nextIdx < 0) {
                state = 'read'
                break
              }
              let enqueued = false
              try {
              // Extract the current event's value and trim whitespace
                const eventValue = buffer.slice(0, nextIdx).trim()
                if (eventValue) {
                // Check if the event limit is reached; if so, throw an error
                  if (count === requestLimit) {
                    throw new Error('Received too many events')
                  }
                  currentEvent = JSON.parse(b64ToStr(JSON.parse(eventValue))).message
                  if (count === 0) {
                    const hash = SPMessage.deserializeHEAD(currentEvent).hash
                    const height = SPMessage.deserializeHEAD(currentEvent).head.height
                    if (height !== sinceHeight || (sinceHash && sinceHash !== hash)) {
                      if (height === sinceHeight && sinceHash && sinceHash !== hash) {
                        throw new ChelErrorForkedChain(`Forked chain: hash(${hash}) !== since(${sinceHash})`)
                      } else {
                        throw new Error(`Unexpected data: hash(${hash}) !== since(${sinceHash || ''}) or height(${height}) !== since(${sinceHeight})`)
                      }
                    }
                  }
                  // If this is the first event in a second or later request,
                  // drop the event because it's already been included in
                  // a previous response
                  if (count++ !== 0 || requestCount !== 0) {
                    controller.enqueue(currentEvent)
                    enqueued = true
                    remainingEvents--
                  }
                }
                // If the stream is finished (indicated by a closing bracket),
                // update `since` (to make the next request if needed) and
                // switch to 'read-eos'.
                if (buffer[nextIdx] === ']') {
                  if (currentEvent) {
                    const deserialized = SPMessage.deserializeHEAD(currentEvent)
                    sinceHeight = deserialized.head.height
                    sinceHash = deserialized.hash
                    state = 'read-eos'
                  } else {
                  // If the response came empty, assume there are no more events
                  // after. Mostly this prevents infinite loops if a server is
                  // claiming there are more events than it's willing to return
                  // data for.
                    state = 'eod'
                  }
                  // This should be an empty string now
                  buffer = buffer.slice(nextIdx + 1).trim()
                } else if (currentEvent) {
                // Otherwise, move the buffer pointer to the next event
                  buffer = buffer.slice(nextIdx + 1).trimStart()
                } else {
                // If the end delimiter (`]`) is missing, throw an error
                  throw new Error('Missing end delimiter')
                }
                // If an event was successfully enqueued, exit the loop to wait
                // for the next pull request
                if (enqueued) {
                  return
                }
              } catch (e) {
                console.error('[chelonia] Error during event parsing', e)
                throw e
              }
              break
            }
            case 'eod': {
              if (remainingEvents === 0 || sinceHeight >= latestHeight) {
                controller.close()
              } else {
                throw new Error('Unexpected end of data')
              }
              return
            }
          }
        }
      } catch (e) {
        console.error('[eventsAfter] Error', { lastUrl }, e)
        // $FlowFixMe[incompatible-use]
        eventsStreamReader?.cancel('Error during pull').catch(e2 => {
          console.error('Error canceling underlying event stream reader on error', e, e2)
        })
        throw e
      }
    }
  })
  if (stream) return s
  // Workaround for <https://bugs.webkit.org/show_bug.cgi?id=215485>
  return collectEventStream(s)
}

export function buildShelterAuthorizationHeader (contractID: string, state?: Object): string {
  if (!state) state = sbp(this.config.stateSelector)[contractID]
  const SAKid = findKeyIdByName(state, '#sak')
  if (!SAKid) {
    throw new Error(`Missing #sak in ${contractID}`)
  }
  const SAK = this.transientSecretKeys[SAKid]
  if (!SAK) {
    throw new Error(`Missing secret #sak (${SAKid}) in ${contractID}`)
  }
  const deserializedSAK = typeof SAK === 'string' ? deserializeKey(SAK) : SAK

  const nonceBytes = new Uint8Array(15)
  // $FlowFixMe[cannot-resolve-name]
  globalThis.crypto.getRandomValues(nonceBytes)

  // <contractID> <UNIX ms time>.<nonce>
  const data = `${contractID} ${sbp('chelonia/time')}.${Buffer.from(nonceBytes).toString('base64')}`

  // shelter <contractID> <UNIX time>.<nonce>.<signature>
  return `shelter ${data}.${sign(deserializedSAK, data)}`
}

export function verifyShelterAuthorizationHeader (authorization: string, rootState?: Object): string {
  const regex = /^shelter (([a-zA-Z0-9]+) ([0-9]+)\.([a-zA-Z0-9+/=]{20}))\.([a-zA-Z0-9+/=]+)$/i
  if (authorization.length > 1024) {
    throw new Error('Authorization header too long')
  }
  const matches = authorization.match(regex)
  if (!matches) {
    throw new Error('Unable to parse shelter authorization header')
  }
  // TODO: Remember nonces and reject already used ones
  const [, data, contractID, timestamp, , signature] = matches
  if (Math.abs(parseInt(timestamp) - Date.now()) > 60e3) {
    throw new Error('Invalid signature time range')
  }
  if (!rootState) rootState = sbp('chelonia/rootState')
  if (!has(rootState, contractID)) {
    throw new Error(`Contract ${contractID} from shelter authorization header not found`)
  }
  const SAKid = findKeyIdByName(rootState[contractID], '#sak')
  if (!SAKid) {
    throw new Error(`Missing #sak in ${contractID}`)
  }
  const SAK = rootState[contractID]._vm.authorizedKeys[SAKid].data
  if (!SAK) {
    throw new Error(`Missing secret #sak (${SAKid}) in ${contractID}`)
  }
  const deserializedSAK = deserializeKey(SAK)

  verifySignature(deserializedSAK, data, signature)

  return contractID
}

export const clearObject = (o: Object) => {
  Object.keys(o).forEach((k) => delete o[k])
}

export const reactiveClearObject = (o: Object, fn: (o: Object, k: string | number) => any) => {
  Object.keys(o).forEach((k) => fn(o, k))
}

export const checkCanBeGarbageCollected = function (id: string): boolean {
  const rootState = sbp(this.config.stateSelector)
  return (
    // Check persistent references
    (!has(rootState.contracts, id) || !rootState.contracts[id] || !has(rootState.contracts[id], 'references')) &&
    // Check ephemeral references
    !has(this.ephemeralReferenceCount, id)) &&
    // Check foreign keys (i.e., that no keys from this contract are being watched)
    (!has(rootState, id) || !has(rootState[id], '_volatile') || !has(rootState[id]._volatile, 'watch') || rootState[id]._volatile.watch.length === 0 || rootState[id]._volatile.watch.filter(([, cID]) => this.subscriptionSet.has(cID)).length === 0)
}

export const collectEventStream = async (s: ReadableStream): Promise<any[]> => {
  const reader = s.getReader()
  const r = []
  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    r.push(value)
  }
  return r
}

// Used inside processing functions for displaying errors at the 'warn' level
// for outgoing messages to increase the signal-to-noise error. See issue #2773.
export const logEvtError = (msg: SPMessage, ...args: any[]) => {
  if (msg._direction === 'outgoing') {
    console.warn(...args)
  } else {
    console.error(...args)
  }
}
