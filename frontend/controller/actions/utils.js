'use strict'

import { DAYS_MILLIS } from '@model/contracts/shared/time.js'
import sbp from '@sbp/sbp'
import { GIMessage } from '~/shared/domains/chelonia/GIMessage.js'
import { encryptedOutgoingData } from '~/shared/domains/chelonia/encryptedData.js'
import { findKeyIdByName, findSuitableSecretKeyId } from '~/shared/domains/chelonia/utils.js'
import { GIErrorUIRuntimeError, LError } from '@common/common.js'
// Using relative path to crypto.js instead of ~-path to workaround some esbuild bug
import { EDWARDS25519SHA512BATCH, keyId, keygen, serializeKey } from '../../../shared/domains/chelonia/crypto.js'
import type { GIActionParams } from './types.js'

// Utility function to send encrypted actions ('chelonia/out/actionEncrypted')
// This function covers the common case of sending an encrypted action that is
// both encrypted with that same contract's CEK and signed with that contract's
// CSK.
// It takes an optional handler function, which receives a sendMessage callback
// to emit the encrypted action when appropriate.
// Note that this function does not currently support specifying custom encryption
// or signing keys, and that such keys in params get overridden.
export function encryptedAction (
  action: string,
  humanError: string | Function,
  handler?: (sendMessage: (params: $Shape<GIActionParams>) => Promise<void>, params: GIActionParams, signingKeyId: string, encryptionKeyId: string, originatingContractID: ?string) => Promise<void>,
  encryptionKeyName?: string,
  signingKeyName?: string
): Object {
  const sendMessageFactory = (outerParams: GIActionParams, signingKeyId: string, innerSigningKeyId: ?string, encryptionKeyId: string, originatingContractID: ?string) => (innerParams?: $Shape<GIActionParams>): Promise<void> => {
    return sbp('chelonia/out/actionEncrypted', {
      ...(innerParams ?? outerParams),
      signingKeyId,
      innerSigningKeyId,
      encryptionKeyId,
      action: action.replace('gi.actions', 'gi.contracts'),
      originatingContractID
    })
  }
  return {
    [action]: async function (params: GIActionParams) {
      try {
        const state = await sbp('chelonia/latestContractState', params.contractID)
        const rootState = sbp('state/vuex/state')
        const signingState = !params.signingContractID || params.signingContractID === params.contractID ? state : await sbp('chelonia/latestContractState', params.signingContractID)

        const signingKeyId = findKeyIdByName(signingState, signingKeyName ?? 'csk')
        const innerSigningKeyId = params.innerSigningKeyId || (params.contractID === rootState.loggedIn.identityContractID ? undefined : findKeyIdByName(rootState[rootState.loggedIn.identityContractID], 'csk'))
        const encryptionKeyId = findKeyIdByName(state, encryptionKeyName ?? 'cek')

        if (!signingKeyId || !encryptionKeyId || !sbp('chelonia/haveSecretKey', signingKeyId)) {
          console.warn(`Refusing to send action ${action} due to missing CSK or CEK`, { contractID: params.contractID, action, signingKeyName, encryptionKeyName, signingKeyId, encryptionKeyId, signingContractID: params.signingContractID, originatingContractID: params.originatingContractID })
          return Promise.reject(new Error(`No key found to send ${action} for contract ${params.contractID}`))
        }

        if ((params.contractID !== rootState.loggedIn.identityContractID && !innerSigningKeyId) || (innerSigningKeyId && !sbp('chelonia/haveSecretKey', innerSigningKeyId))) {
          console.warn(`Refusing to send action ${action} due to missing inner signing key ID`, { contractID: params.contractID, action, signingKeyName, encryptionKeyName, signingKeyId, encryptionKeyId, signingContractID: params.signingContractID, originatingContractID: params.originatingContractID, innerSigningKeyId })
          return Promise.reject(new Error(`No key found to send ${action} for contract ${params.contractID}`))
        }

        const sm = sendMessageFactory(params, signingKeyId, innerSigningKeyId, encryptionKeyId, params.originatingContractID)

        // make sure to await here so that if there's an error we show user-facing string
        if (handler) {
          return await handler(sm, params, signingKeyId, encryptionKeyId, params.originatingContractID)
        } else {
          return await sm()
        }
      } catch (e) {
        console.error(`${action} failed!`, e)
        const userFacingErrStr = typeof humanError === 'string'
          ? `${humanError} ${LError(e).reportError}`
          : humanError(params, e)
        throw new GIErrorUIRuntimeError(userFacingErrStr)
      }
    }
  }
}

export async function createInvite ({ quantity = 1, creator, expires, invitee }: {
  quantity: number, creator: string, expires: number, invitee?: string
}): Promise<{inviteKeyId: string; creator: string; invitee?: string; }> {
  const rootState = sbp('state/vuex/state')

  if (!rootState.currentGroupId) {
    throw new Error('Current group not selected')
  }

  const contractID = rootState.currentGroupId

  if (
    !rootState[contractID] ||
    !rootState[contractID]._vm ||
    !findSuitableSecretKeyId(rootState[contractID], '*', ['sig']) ||
    rootState[contractID]._volatile?.pendingKeyRequests?.length
  ) {
    throw new Error('Invalid or missing current group state')
  }

  const state = rootState[contractID]

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
    creator,
    invitee
  }
}
