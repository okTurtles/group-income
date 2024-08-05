'use strict'

import { DAYS_MILLIS } from '@model/contracts/shared/time.js'
import sbp from '@sbp/sbp'
import { GIMessage } from '~/shared/domains/chelonia/GIMessage.js'
import { encryptedOutgoingData } from '~/shared/domains/chelonia/encryptedData.js'
import { findKeyIdByName, findSuitableSecretKeyId } from '~/shared/domains/chelonia/utils.js'
import { GIErrorMissingSigningKeyError, GIErrorUIRuntimeError, LError } from '@common/common.js'
// Using relative path to crypto.js instead of ~-path to workaround some esbuild bug
import { EDWARDS25519SHA512BATCH, keyId, keygen, serializeKey } from '../../../shared/domains/chelonia/crypto.js'
import type { GIActionParams } from './types.js'

const enqueueDeferredPromise = (queue) => {
  let finished: () => any = Boolean // asssigned to keep Flow happy
  const onFinishPromise = new Promise<any>((resolve) => {
    finished = resolve
  })
  sbp('okTurtles.eventQueue/queueEvent', queue, () => onFinishPromise)

  return finished
}

// Utility function to send encrypted actions ('chelonia/out/actionEncrypted')
// This function covers the common case of sending an encrypted action that is
// both encrypted with that same contract's CEK and signed with that contract's
// CSK.
// It takes an optional handler function, which receives a sendMessage callback
// to emit the encrypted action when appropriate.
// Note that this function does not currently support specifying custom encryption
// or signing keys, and that such keys in params get overridden.
export const encryptedAction = (
  action: string,
  humanError: string | Function,
  handler?: (sendMessage: (params: $Shape<GIActionParams>) => any, params: GIActionParams, signingKeyId: string, encryptionKeyId: string, originatingContractID: ?string) => Promise<void>,
  encryptionKeyName?: string,
  signingKeyName?: string,
  innerSigningKeyName?: string
): Object => {
  const sendMessageFactory = (outerParams: GIActionParams, signingKeyId: string, innerSigningKeyId: ?string, encryptionKeyId: string, originatingContractID: ?string) => (innerParams?: $Shape<GIActionParams>): any[] | Promise<void> => {
    const params = innerParams ?? outerParams
    const invocation = [
      'chelonia/out/actionEncrypted',
      {
        ...params,
        signingKeyId,
        innerSigningKeyId,
        encryptionKeyId,
        action: action.replace('gi.actions', 'gi.contracts'),
        originatingContractID
      }
    ]

    if (params.returnInvocation) {
      return invocation
    } else {
      return sbp(...invocation)
    }
  }
  return {
    [action]: async function (params: GIActionParams) {
      const contractID = params.contractID
      if (!contractID) {
        throw new Error('Missing contract ID')
      }

      // The following ensures that logging out waits until all pending actions
      // are written
      const finished = enqueueDeferredPromise('encrypted-action')

      try {
        // Writing to a contract requires being subscribed to it
        // Since we're only interested in writing and we don't know whether
        // we're subscribed or should be, we use an ephemeral retain here that
        // is undone at the end in a finally block.
        await sbp('chelonia/contract/retain', contractID, { ephemeral: true })
        const state = {
          [contractID]: await sbp('chelonia/latestContractState', contractID)
        }
        const rootState = sbp('state/vuex/state')

        // Default signingContractID is the current contract
        const signingContractID = params.signingContractID || contractID
        if (!state[signingContractID]) {
          state[signingContractID] = await sbp('chelonia/latestContractState', signingContractID)
        }

        // Default innerSigningContractID is the current logged in identity
        // contract ID, unless we are signing for the current identity contract
        // If params.innerSigningContractID is explicitly set to null, then
        // no default value will be used.
        const innerSigningContractID = params.innerSigningContractID !== undefined
          ? params.innerSigningContractID
          : contractID === rootState.loggedIn.identityContractID
            ? null
            : rootState.loggedIn.identityContractID

        if (innerSigningContractID && !state[innerSigningContractID]) {
          state[innerSigningContractID] = await sbp('chelonia/latestContractState', innerSigningContractID)
        }

        const signingKeyId = params.signingKeyId || findKeyIdByName(state[signingContractID], signingKeyName ?? 'csk')
        // Inner signing key ID:
        //  (1) If params.innerSigningKeyId is set, honor it
        //      (a) If it's null, then no inner signature will be used
        //      (b) If it's undefined, it's treated the same as if it's not set
        //  (2) If params.innerSigningKeyId is not set:
        //      (a) If innerSigningContractID is not set, then no inner
        //          signature will be used
        //      (b) Else, use the key by name `innerSigningKeyName` in
        //          `innerSigningContractID`

        const innerSigningKeyId = params.innerSigningKeyId || (
          params.innerSigningKeyId !== null &&
          innerSigningContractID &&
          findKeyIdByName(state[innerSigningContractID], innerSigningKeyName ?? 'csk')
        )
        const encryptionKeyId = params.encryptionKeyId || findKeyIdByName(state[contractID], encryptionKeyName ?? 'cek')

        if (!signingKeyId || !encryptionKeyId || !await sbp('chelonia/haveSecretKey', signingKeyId)) {
          console.warn(`Refusing to send action ${action} due to missing CSK or CEK`, { contractID, action, signingKeyName, encryptionKeyName, signingKeyId, encryptionKeyId, signingContractID: params.signingContractID, originatingContractID: params.originatingContractID })
          throw new GIErrorMissingSigningKeyError(`No key found to send ${action} for contract ${contractID}`)
        }

        if (innerSigningContractID && (!innerSigningKeyId || !await sbp('chelonia/haveSecretKey', innerSigningKeyId))) {
          console.warn(`Refusing to send action ${action} due to missing inner signing key ID`, { contractID, action, signingKeyName, encryptionKeyName, signingKeyId, encryptionKeyId, signingContractID: params.signingContractID, originatingContractID: params.originatingContractID, innerSigningKeyId })
          throw new GIErrorMissingSigningKeyError(`No key found to send ${action} for contract ${contractID}`)
        }

        const sm = sendMessageFactory(params, signingKeyId, innerSigningKeyId || null, encryptionKeyId, params.originatingContractID)

        // make sure to await here so that if there's an error we show user-facing string
        if (handler) {
          return await handler(sm, params, signingKeyId, encryptionKeyId, params.originatingContractID)
        } else {
          return await sm()
        }
      } catch (e) {
        const userFacingErrStr = typeof humanError === 'string'
          ? `${humanError} ${LError(e).reportError}`
          : humanError(params, e)
        throw new GIErrorUIRuntimeError(userFacingErrStr, { cause: e })
      } finally {
        finished()
        await sbp('chelonia/contract/release', contractID, { ephemeral: true })
      }
    }
  }
}

export const encryptedNotification = (
  action: string,
  humanError: string | Function,
  handler?: (sendMessage: (params: $Shape<GIActionParams>) => any, params: GIActionParams, signingKeyId: string, encryptionKeyId: string, originatingContractID: ?string) => Promise<void>,
  encryptionKeyName?: string,
  signingKeyName?: string,
  innerSigningKeyName?: string
): Object => {
  const sendMessageFactory = (outerParams: GIActionParams, signingKeyId: string, innerSigningKeyId: ?string, encryptionKeyId: string, originatingContractID: ?string) => (innerParams?: $Shape<GIActionParams>): any[] | Promise<void> => {
    const params = innerParams ?? outerParams

    const actionReplaced = action.replace('gi.actions', 'gi.contracts')

    return sbp('chelonia/out/encryptedOrUnencryptedPubMessage', {
      contractID: params.contractID,
      contractName: actionReplaced.split('/', 2).join('/'),
      innerSigningKeyId,
      encryptionKeyId,
      signingKeyId,
      data: [actionReplaced, params.data]
    })
  }
  return {
    [action]: async function (params: GIActionParams) {
      const contractID = params.contractID
      if (!contractID) {
        throw new Error('Missing contract ID')
      }

      try {
        // Writing to a contract requires being subscribed to it
        await sbp('chelonia/contract/retain', contractID, { ephemeral: true })
        const state = {
          [contractID]: await sbp('chelonia/latestContractState', contractID)
        }
        const rootState = sbp('state/vuex/state')

        // Default signingContractID is the current contract
        const signingContractID = params.signingContractID || contractID
        if (!state[signingContractID]) {
          state[signingContractID] = await sbp('chelonia/latestContractState', signingContractID)
        }

        // Default innerSigningContractID is the current logged in identity
        // contract ID, unless we are signing for the current identity contract
        // If params.innerSigningContractID is explicitly set to null, then
        // no default value will be used.
        const innerSigningContractID = params.innerSigningContractID !== undefined
          ? params.innerSigningContractID
          : contractID === rootState.loggedIn.identityContractID
            ? null
            : rootState.loggedIn.identityContractID

        if (innerSigningContractID && !state[innerSigningContractID]) {
          state[innerSigningContractID] = await sbp('chelonia/latestContractState', innerSigningContractID)
        }

        const signingKeyId = params.signingKeyId || findKeyIdByName(state[signingContractID], signingKeyName ?? 'csk')
        // Inner signing key ID:
        //  (1) If params.innerSigningKeyId is set, honor it
        //      (a) If it's null, then no inner signature will be used
        //      (b) If it's undefined, it's treated the same as if it's not set
        //  (2) If params.innerSigningKeyId is not set:
        //      (a) If innerSigningContractID is not set, then no inner
        //          signature will be used
        //      (b) Else, use the key by name `innerSigningKeyName` in
        //          `innerSigningContractID`

        const innerSigningKeyId = params.innerSigningKeyId || (
          params.innerSigningKeyId !== null &&
          innerSigningContractID &&
          findKeyIdByName(state[innerSigningContractID], innerSigningKeyName ?? 'csk')
        )
        const encryptionKeyId = params.encryptionKeyId || findKeyIdByName(state[contractID], encryptionKeyName ?? 'cek')

        if (!signingKeyId || !encryptionKeyId || !await sbp('chelonia/haveSecretKey', signingKeyId)) {
          console.warn(`Refusing to send action ${action} due to missing CSK or CEK`, { contractID, action, signingKeyName, encryptionKeyName, signingKeyId, encryptionKeyId, signingContractID: params.signingContractID, originatingContractID: params.originatingContractID })
          throw new GIErrorMissingSigningKeyError(`No key found to send ${action} for contract ${contractID}`)
        }

        if (innerSigningContractID && (!innerSigningKeyId || !await sbp('chelonia/haveSecretKey', innerSigningKeyId))) {
          console.warn(`Refusing to send action ${action} due to missing inner signing key ID`, { contractID, action, signingKeyName, encryptionKeyName, signingKeyId, encryptionKeyId, signingContractID: params.signingContractID, originatingContractID: params.originatingContractID, innerSigningKeyId })
          throw new GIErrorMissingSigningKeyError(`No key found to send ${action} for contract ${contractID}`)
        }

        const sm = sendMessageFactory(params, signingKeyId, innerSigningKeyId || null, encryptionKeyId, params.originatingContractID)

        // make sure to await here so that if there's an error we show user-facing string
        if (handler) {
          return await handler(sm, params, signingKeyId, encryptionKeyId, params.originatingContractID)
        } else {
          return await sm()
        }
      } catch (e) {
        const userFacingErrStr = typeof humanError === 'string'
          ? `${humanError} ${LError(e).reportError}`
          : humanError(params, e)
        throw new GIErrorUIRuntimeError(userFacingErrStr, { cause: e })
      } finally {
        await sbp('chelonia/contract/release', contractID, { ephemeral: true })
      }
    }
  }
}

export async function createInvite ({ contractID, quantity = 1, creatorID, expires, invitee }: {
  contractID: string, quantity?: number, creatorID: string, expires: number, invitee?: string
}): Promise<{inviteKeyId: string; creatorID: string; invitee?: string; }> {
  const state = await sbp('chelonia/contract/state', contractID)

  if (
    !state ||
    !state._vm ||
    !findSuitableSecretKeyId(state, '*', ['sig']) ||
    state._volatile?.pendingKeyRequests?.length
  ) {
    throw new Error('Invalid or missing current group state')
  }

  const CEKid = findKeyIdByName(state, 'cek')
  const CSKid = findKeyIdByName(state, 'csk')

  if (!CEKid || !CSKid) {
    throw new Error('Contract is missing a CEK or CSK')
  }

  const inviteKey = keygen(EDWARDS25519SHA512BATCH)
  const inviteKeyId = keyId(inviteKey)
  const inviteKeyP = serializeKey(inviteKey, false)
  const inviteKeyS = encryptedOutgoingData(state, CEKid, serializeKey(inviteKey, true))

  await sbp('chelonia/out/keyAdd', {
    contractID,
    contractName: 'gi.contracts/group',
    data: [{
      id: inviteKeyId,
      name: '#inviteKey-' + inviteKeyId,
      purpose: ['sig'],
      ringLevel: Number.MAX_SAFE_INTEGER,
      permissions: [GIMessage.OP_KEY_REQUEST],
      meta: {
        quantity,
        expires: Date.now() + DAYS_MILLIS * expires,
        private: {
          content: inviteKeyS
        }
      },
      data: inviteKeyP
    }],
    signingKeyId: CSKid
  })

  return {
    inviteKeyId,
    creatorID,
    invitee
  }
}

export function groupContractsByType (contracts: Object): Object {
  const contractIDs = Object.create(null)
  if (contracts) {
    // $FlowFixMe[incompatible-use]
    Object.entries(contracts).forEach(([id, { type }]) => {
      if (!contractIDs[type]) {
        contractIDs[type] = []
      }
      contractIDs[type].push(id)
    })
  }
  return contractIDs
}

export async function syncContractsInOrder (groupedContractIDs: Object): Promise<any> {
  // We need to sync contracts in this order to ensure that we have all the
  // corresponding secret keys. Group chatrooms use group keys but there's
  // no OP_KEY_SHARE, which will result in the keys not being available when
  // the group keys are rotated.
  // TODO: This functionality could be moved into Chelonia by keeping track
  // of when secret keys without OP_KEY_SHARE become available.
  const contractSyncPriorityList = [
    'gi.contracts/identity',
    'gi.contracts/group',
    'gi.contracts/chatroom'
  ]
  const getContractSyncPriority = (key) => {
    const index = contractSyncPriorityList.indexOf(key)
    return index === -1 ? contractSyncPriorityList.length : index
  }

  try {
    // $FlowFixMe[incompatible-call]
    await Promise.all(Object.entries(groupedContractIDs).sort(([a], [b]) => {
      // Sync contracts in order based on type
      return getContractSyncPriority(a) - getContractSyncPriority(b)
    }).map(([, ids]) => {
      return sbp('chelonia/contract/sync', ids, { force: true })
    }))
  } catch (err) {
    console.error('Error during contract sync (syncing all contractIDs)', err)
    throw err
  }
}
