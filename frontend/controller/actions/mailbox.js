'use strict'

import sbp from '@sbp/sbp'
import { GIErrorUIRuntimeError, L, LError } from '@common/common.js'
import { omit } from '@model/contracts/shared/giLodash.js'
import { encryptedAction } from './utils.js'
import type { GIActionParams } from './types.js'
import type { GIMessage } from '~/shared/domains/chelonia/chelonia.js'
import { CONTRACT_IS_SYNCING } from '~/shared/domains/chelonia/events.js'
import { logExceptNavigationDuplicated } from '~/frontend/views/utils/misc.js'

export default (sbp('sbp/selectors/register', {
  'gi.actions/mailbox/create': async function ({
    data = {},
    options: { sync = true } = {},
    publishOptions
  }): Promise<GIMessage> {
    try {
      const mailbox = await sbp('chelonia/out/registerContract', {
        contractName: 'gi.contracts/mailbox', publishOptions, data
      })
      if (sync) {
        await sbp('chelonia/contract/sync', mailbox.contractID())
      }
      return mailbox
    } catch (e) {
      console.error('gi.actions/mailbox/create failed!', e)
      throw new GIErrorUIRuntimeError(L('Failed to create mailbox: {reportError}', LError(e)))
    }
  },
  'gi.actions/mailbox/createDirectMessage': async function (params: GIActionParams) {
    try {
      await sbp('chelonia/out/actionEncrypted', {
        ...omit(params, ['options']),
        action: 'gi.contracts/mailbox/createDirectMessage'
      })

      const redirectToDMChatroom = async (contractID, isSyncing) => {
        if (contractID === params.data.contractID && isSyncing === false) {
          await sbp('controller/router')
            .push({ name: 'GroupChatConversation', params: { chatRoomId: contractID } })
            .catch(logExceptNavigationDuplicated)
          sbp('okTurtles.events/off', CONTRACT_IS_SYNCING, redirectToDMChatroom)
        }
      }

      sbp('okTurtles.events/on', CONTRACT_IS_SYNCING, redirectToDMChatroom)
    } catch (e) {
      console.error('gi.actions/mailbox/createDirectMessage failed!', e)
      throw new GIErrorUIRuntimeError(L('Failed to create a new direct message channel.'))
    }
  },
  ...encryptedAction('gi.actions/mailbox/setAutoJoinAllowance',
    L('Failed to set Mailbox attributes. {attribute}', { attribute: 'autoJoinAllownace' })),
  ...encryptedAction('gi.actions/mailbox/joinDirectMessage', L('Failed to join a new direct message channel.'))
}): string[])
