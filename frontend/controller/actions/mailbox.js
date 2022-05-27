'use strict'

import {
  sbp,
  GIErrorUIRuntimeError,
  L, LError
} from '/assets/js/common.js' // eslint-disable-line import/no-absolute-path
import { encryptedAction } from './utils.js'
import type { GIMessage } from '~/shared/domains/chelonia/chelonia.js'

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
  ...encryptedAction('gi.actions/mailbox/postMessage', L('Failed to post message to mailbox.'))
}): string[])
