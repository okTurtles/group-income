'use strict'

import sbp from '@sbp/sbp'
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
        contractName: 'gi.contracts/mailbox', publishOptions, keys: [], data
      })
      console.log('gi.actions/mailbox/create', { mailbox })
      if (sync) {
        await sbp('chelonia/contract/sync', mailbox.contractID())
      }
      return mailbox
    } catch (e) {
      console.error('gi.actions/mailbox/create failed!', e)
      throw new GIErrorUIRuntimeError(L('Failed to create mailbox: {reportError}', LError(e)))
    }
  },
  ...encryptedAction('gi.actions/mailbox/postMessage', L('Failed to post message to mailbox.'))
}): string[])
