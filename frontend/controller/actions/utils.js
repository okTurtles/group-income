'use strict'

import { GIErrorUIRuntimeError, LError } from '@common/common.js'
import sbp from '@sbp/sbp'
import { findKeyIdByName } from '~/shared/domains/chelonia/utils.js'
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
  handler?: (sendMessage: (params: $Shape<GIActionParams>) => Promise<void>, params: GIActionParams) => Promise<void>,
  encryptionKeyName?: string,
  signingKeyName?: string
): Object {
  const sendMessage = (outerParams: GIActionParams, state: Object) => (innerParams?: $Shape<GIActionParams>): Promise<void> => {
    const signingKeyId = findKeyIdByName(state, signingKeyName ?? 'csk')
    const encryptionKeyId = findKeyIdByName(state, encryptionKeyName ?? 'cek')

    if (!state?._volatile?.keys || !state._volatile.keys[signingKeyId] || !state._volatile.keys[encryptionKeyId]) {
      console.warn(`Refusing to emit action ${action} due to missing CSK or CEK`)
      // TODO: Change to Promise.reject()
      return Promise.resolve()
    }

    return sbp('chelonia/out/actionEncrypted', {
      ...(innerParams ?? outerParams),
      signingKeyId,
      encryptionKeyId,
      action: action.replace('gi.actions', 'gi.contracts')
    })
  }
  return {
    [action]: async function (params: GIActionParams) {
      try {
        const state = await sbp('chelonia/latestContractState', params.contractID)
        // make sure to await here so that if there's an error we show user-facing string
        if (handler) {
          return await handler(sendMessage(params, state), params)
        } else {
          return await sendMessage(params, state)()
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
