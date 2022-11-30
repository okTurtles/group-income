'use strict'

import sbp from '@sbp/sbp'
import { GIErrorUIRuntimeError, L, LError } from '@common/common.js'
import { omit } from '@model/contracts/shared/giLodash.js'
import { CHATROOM_PRIVACY_LEVEL, CHATROOM_TYPES } from '@model/contracts/shared/constants.js'
import { encryptedAction } from './utils.js'
import type { GIActionParams } from './types.js'
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
  'gi.actions/mailbox/createDirectMessage': async function (params: GIActionParams) {
    try {
      const rootState = sbp('state/vuex/state')
      const rootGetters = sbp('state/vuex/getters')
      const partnerProfile = rootGetters.ourContactProfiles[params.data.username]

      if (!partnerProfile) {
        throw new GIErrorUIRuntimeError(L('Incorrect username to create direct message.'))
      }

      const message = await sbp('gi.actions/chatroom/create', {
        data: {
          attributes: {
            name: '',
            description: '',
            privacyLevel: CHATROOM_PRIVACY_LEVEL.PRIVATE,
            type: CHATROOM_TYPES.INDIVIDUAL
          }
        },
        hooks: {
          prepublish: params.hooks?.prepublish,
          postpublish: null
        }
      })

      await sbp('gi.actions/chatroom/join', {
        ...omit(params, ['options', 'data', 'hook']),
        contractID: message.contractID(),
        data: { username: rootState.loggedIn.username }
      })

      const paramsData = {
        username: params.data.username,
        contractID: message.contractID()
      }
      await sbp('chelonia/out/actionEncrypted', {
        ...omit(params, ['options', 'data', 'hook']),
        data: paramsData,
        action: 'gi.contracts/mailbox/createDirectMessage'
      })

      await sbp('gi.actions/chatroom/join', {
        ...omit(params, ['options', 'data', 'hook']),
        contractID: message.contractID(),
        data: { username: partnerProfile.username }
      })

      await sbp('gi.actions/mailbox/joinDirectMessage', {
        ...omit(params, ['options', 'data', 'hook']),
        contractID: partnerProfile.mailbox,
        data: paramsData,
        hooks: {
          prepublish: null,
          postpublish: params.hooks?.postpublish
        }
      })
    } catch (e) {
      console.error('gi.actions/mailbox/createDirectMessage failed!', e)
      throw new GIErrorUIRuntimeError(L('Failed to create a new direct message channel.'))
    }
  },
  ...encryptedAction('gi.actions/mailbox/setAttributes', L('Failed to set mailbox attributes.')),
  ...encryptedAction('gi.actions/mailbox/joinDirectMessage', L('Failed to join a new direct message channel.')),
  ...encryptedAction('gi.actions/mailbox/leaveDirectMessage', L('Failed to leave direct message channel.'))
}): string[])
