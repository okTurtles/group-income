'use strict'

import sbp from '@sbp/sbp'
import {
  GIErrorUIRuntimeError,
  LError
} from '/assets/js/common.js' // eslint-disable-line import/no-absolute-path
import type { GIActionParams } from './types.js'

export function encryptedAction (action: string, humanError: string | Function): Object {
  return {
    [action]: async function (params: GIActionParams) {
      try {
        return await sbp('chelonia/out/actionEncrypted', {
          ...params, action: action.replace('gi.actions', 'gi.contracts')
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
