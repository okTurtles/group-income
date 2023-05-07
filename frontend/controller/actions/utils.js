'use strict'

import sbp from '@sbp/sbp'
import { deserializeKey, encrypt } from '../../../shared/domains/chelonia/crypto.js'
import { GIErrorUIRuntimeError, LError } from '@common/common.js'
import type { GIActionParams } from './types.js'
import type { GIKey } from '~/shared/domains/chelonia/GIMessage.js'

export function encryptedAction (action: string, humanError: string | Function, handler?: (sendMessage: (params: $Shape<GIActionParams>) => Promise<void>, params: GIActionParams) => Promise<void>): Object {
  const sendMessage = (outerParams: GIActionParams, state: Object) => (innerParams?: $Shape<GIActionParams>) => sbp('chelonia/out/actionEncrypted', {
    ...(innerParams ?? outerParams),
    signingKeyId: (((Object.values(Object(state?._vm?.authorizedKeys)): any): GIKey[]).find((k) => k?.meta?.type === 'csk')?.id: ?string),
    encryptionKeyId: (((Object.values(Object(state?._vm?.authorizedKeys)): any): GIKey[]).find((k) => k?.meta?.type === 'cek')?.id: ?string),
    action: action.replace('gi.actions', 'gi.contracts')
  })
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

export const shareKeysWithSelf = (action: string, ourContractName: string): { [k: string]: { (): void } } => ({
  [action]: async ({ ourContractID, theirContractID }) => {
    if (ourContractID === theirContractID) {
      return
    }

    const contractState = await sbp('chelonia/latestContractState', theirContractID)

    if (contractState?._volatile?.keys) {
      const state = await sbp('chelonia/latestContractState', ourContractID)

      const CEKid = (((Object.values(Object(state?._vm?.authorizedKeys)): any): GIKey[]).find((k) => k?.meta?.type === 'cek')?.id: ?string)
      const CSKid = (((Object.values(Object(state?._vm?.authorizedKeys)): any): GIKey[]).find((k) => k?.meta?.type === 'csk')?.id: ?string)
      const CEK = deserializeKey(state?._volatile?.keys?.[CEKid])

      await sbp('chelonia/out/keyShare', {
        destinationContractID: ourContractID,
        destinationContractName: ourContractName,
        data: {
          contractID: theirContractID,
          keys: Object.entries(contractState._volatile.keys).map(([keyId, key]: [string, mixed]) => ({
            id: keyId,
            meta: {
              private: {
                keyId: CEKid,
                content: encrypt(CEK, (key: any))
              }
            }
          }))
        },
        signingKeyId: CSKid
      })
    }
  }
})
