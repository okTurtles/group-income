'use strict'
import sbp from '~/shared/sbp.js'
import type { GIActionParams } from './types.js'

export default (sbp('sbp/selectors/register', {
  'gi.actions/chatroom/create': async function (params: GIActionParams) {
    const message = await sbp('chelonia/out/registerContract', {
      contractName: 'gi.contracts/chatroom',
      data: params.data
    })

    return message
  },
  'gi.actions/chatroom/join': async function (params: GIActionParams) {
    await sbp('chelonia/out/actionEncrypted', {
      ...params, action: 'gi.contracts/chatroom/join'
    })
  },
  'gi.actions/chatroom/rename': async function (params: GIActionParams) {
    await sbp('chelonia/out/actionEncrypted', {
      ...params, action: 'gi.contracts/chatroom/rename'
    })
  },
  'gi.actions/chatroom/changeDescription': async function (params: GIActionParams) {
    await sbp('chelonia/out/actionEncrypted', {
      ...params, action: 'gi.contracts/chatroom/changeDescription'
    })
  }
}): string[])
