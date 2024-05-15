'use strict'

import sbp from '@sbp/sbp'
import { SWITCH_GROUP } from '@utils/events.js'
import type { ChelKeyRequestParams } from '~/shared/domains/chelonia/chelonia.js'
import type { GIActionParams } from './types.js'

export default (sbp('sbp/selectors/register', {
  'gi.app/group/createAndSwitch': async function (params: GIActionParams) {
    const contractID = await sbp('gi.actions/group/create', params)
    sbp('gi.app/group/switch', contractID)
    return contractID
  },
  'gi.app/group/switch': function (groupId) {
    sbp('state/vuex/commit', 'setCurrentGroupId', groupId)
    sbp('okTurtles.events/emit', SWITCH_GROUP, { contractID: groupId })
  },
  'gi.app/group/joinAndSwitch': async function (params: $Exact<ChelKeyRequestParams>) {
    await sbp('gi.actions/group/join', params)
    // after joining, we can set the current group
    return sbp('gi.app/group/switch', params.contractID)
  },
  'gi.app/group/joinWithInviteSecret': async function (groupId: string, secret: string) {
    const result = await sbp('gi.actions/group/joinWithInviteSecret', groupId, secret)
    sbp('gi.app/group/switch', groupId)
    return result
  }
}))
