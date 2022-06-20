'use strict'
import sbp from '@sbp/sbp'
import { L, GIErrorUIRuntimeError } from '@common/common.js'
import { omit } from '@model/contracts/shared/giLodash.js'
import { encryptedAction } from './utils.js'
import type { GIRegParams } from './types.js'

export default (sbp('sbp/selectors/register', {
  'gi.actions/chatroom/create': async function (params: GIRegParams) {
    try {
      return await sbp('chelonia/out/registerContract', {
        ...omit(params, ['options']), // any 'options' are for this action, not for Chelonia
        contractName: 'gi.contracts/chatroom'
      })
    } catch (e) {
      console.error('gi.actions/chatroom/register failed!', e)
      throw new GIErrorUIRuntimeError(L('Failed to create chat channel.'))
    }
  },
  ...encryptedAction('gi.actions/chatroom/addMessage', L('Failed to add message.')),
  ...encryptedAction('gi.actions/chatroom/editMessage', L('Failed to edit message.')),
  ...encryptedAction('gi.actions/chatroom/deleteMessage', L('Failed to delete message.')),
  ...encryptedAction('gi.actions/chatroom/makeEmotion', L('Failed to make emotion.')),
  ...encryptedAction('gi.actions/chatroom/join', L('Failed to join chat channel.')),
  ...encryptedAction('gi.actions/chatroom/rename', L('Failed to rename chat channel.')),
  ...encryptedAction('gi.actions/chatroom/changeDescription', L('Failed to change chat channel description.')),
  ...encryptedAction('gi.actions/chatroom/leave', L('Failed to leave chat channel.')),
  ...encryptedAction('gi.actions/chatroom/delete', L('Failed to delete chat channel.'))
}): string[])
