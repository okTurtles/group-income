'use strict'

import sbp from '@sbp/sbp'
import { GIErrorUIRuntimeError, LError } from '@common/common.js'
import type { GIActionParams } from './types.js'
import type { GIKey } from '~/shared/domains/chelonia/GIMessage.js'

export function encryptedAction (action: string, humanError: string | Function): Object {
  return {
    [action]: async function (params: GIActionParams) {
      try {
        const state = await sbp('chelonia/latestContractState', params.contractID)
        return await sbp('chelonia/out/actionEncrypted', {
          ...params,
          signingKeyId: (((Object.values(Object(state?._vm?.authorizedKeys)): any): GIKey[]).find((k) => k?.meta?.type === 'csk')?.id: ?string),
          encryptionKeyId: (((Object.values(Object(state?._vm?.authorizedKeys)): any): GIKey[]).find((k) => k?.meta?.type === 'cek')?.id: ?string),
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
