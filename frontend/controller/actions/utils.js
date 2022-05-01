'use strict'

import sbp from '@sbp/sbp'
import type { GIActionParams } from './types.js'
import { GIErrorUIRuntimeError } from '@model/errors.js'
import { LError } from '@view-utils/translations.js'

export function encryptedAction (action: string, humanError: string | Function): Object {
  return {
    [action]: async function (params: GIActionParams) {
      try {
        const state = await sbp('chelonia/latestContractState', params.contractID)
        return await sbp('chelonia/out/actionEncrypted', {
          signingKeyId: (state?._vm?.authorizedKeys?.find((k) => k.meta?.type === 'csk')?.id: ?string),
          encryptionKeyId: (state?._vm?.authorizedKeys?.find((k) => k.meta?.type === 'cek')?.id: ?string),
          ...params,
          action: action.replace('gi.actions', 'gi.contracts')
        })
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
