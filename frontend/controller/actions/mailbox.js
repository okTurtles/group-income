'use strict'

import sbp from '~/shared/sbp.js'
import { GIErrorUIRuntimeError } from '@model/errors.js'
import L, { LError } from '@view-utils/translations.js'
import { encryptedAction } from './utils.js'
import { GIMessage } from '~/shared/domains/chelonia/GIMessage.js'

export default (sbp('sbp/selectors/register', {
  'gi.actions/mailbox/create': async function ({
    data = {},
    options: { sync = true } = {},
    publishOptions
  }): Promise<GIMessage> {
    try {
      const mailbox = await sbp('chelonia/out/registerContract', {
        contractName: 'gi.contracts/mailbox',
        publishOptions,
        data,
        // TODO add CSK, CEK
        keys: []
      })
      if (sync) {
        await sbp('gi.actions/contract/syncAndWait', mailbox.contractID())
      }
      return mailbox
    } catch (e) {
      console.error('gi.actions/mailbox/create failed!', e)
      throw new GIErrorUIRuntimeError(L('Failed to create mailbox: {reportError}', LError(e)))
    }
  },
  ...encryptedAction('gi.actions/mailbox/postMessage', L('Failed to post message to mailbox.'))
}): string[])
