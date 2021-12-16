'use strict'
import sbp from '~/shared/sbp.js'
import type { GIActionParams } from './types.js'

export default (sbp('sbp/selectors/register', {
  'gi.actions/chatroom/create': async function (params: GIActionParams) {
    const message = await sbp('chelonia/out/registerContract', {
      contractName: 'gi.contracts/chatroom',
      data: params.data
    })

    sbp('state/enqueueContractSync', message.contractID())

    return message
  },
  'gi.actions/chatroom/join': async function (params: $Exact<GIActionParams>) {
    await sbp('state/enqueueContractSync', params.contractID)

    await sbp('chelonia/out/actionEncrypted', {
      action: 'gi.contracts/chatroom/join', ...params
    })
  },
  'gi.actions/chatroom/createAndJoin': async function (params: GIActionParams) {
    const message = await sbp('gi.actions/chatroom/create', params)

    await sbp('gi.actions/chatroom/join', {
      contractID: message.contractID(),
      data: {}
    })
    return message
  }
}): string[])
