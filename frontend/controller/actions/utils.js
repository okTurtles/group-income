'use strict'

import sbp from '@sbp/sbp'
import { GIErrorUIRuntimeError, LError } from '@common/common.js'
import type { GIActionParams } from './types.js'
import type { GIKey } from '~/shared/domains/chelonia/GIMessage.js'

// Utility function to send encrypted actions ('chelonia/out/actionEncrypted')
// This function covers the common case of sending an encrypted action that is
// both encrypted with that same contract's CEK and signed with that contract's
// CSK.
// It takes an optional handler function, which receives a sendMessage callback
// to emit the encrypted action when appropriate.
// Note that this function does not currently support specifying custom encryption
// or signing keys, and that such keys in params get overridden.
export function encryptedAction (action: string, humanError: string | Function, handler?: (sendMessage: (params: $Shape<GIActionParams>) => Promise<void>, params: GIActionParams) => Promise<void>): Object {
  const sendMessage = (outerParams: GIActionParams, state: Object) => (innerParams?: $Shape<GIActionParams>): Promise<void> => {
    const signingKeyId = (((Object.values(Object(state?._vm?.authorizedKeys)): any): GIKey[]).find((k) => k?.name === 'csk')?.id: ?string)
    const encryptionKeyId = (((Object.values(Object(state?._vm?.authorizedKeys)): any): GIKey[]).find((k) => k?.name === 'cek')?.id: ?string)

    if (!state?._volatile?.keys || !state._volatile.keys[signingKeyId] || !state._volatile.keys[signingKeyId]) {
      console.warn(`Refusing to emit action ${action} due to missing CSK or CEK`)
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

        if (handler) {
          return handler(sendMessage(params, state), params)
        } else {
          return sendMessage(params, state)()
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
