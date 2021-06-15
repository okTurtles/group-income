import sbp from '~/shared/sbp.js'
import { createInvite } from '@model/contracts/group.js'
import { INVITE_INITIAL_CREATOR } from '@model/contracts/constants.js'
import proposals from '@model/contracts/voting/proposals.js'
import {
  PROPOSAL_INVITE_MEMBER,
  PROPOSAL_REMOVE_MEMBER,
  PROPOSAL_GROUP_SETTING_CHANGE,
  PROPOSAL_PROPOSAL_SETTING_CHANGE,
  PROPOSAL_GENERIC
} from '@model/contracts/voting/constants.js'
import { GIErrorUIRuntimeError } from '@model/errors.js'

import { imageUpload } from '@utils/image.js'
import { merge } from '@utils/giLodash.js'
import L, { LError } from '@view-utils/translations.js'

import type { GIActionParams } from './types.js'

export default (sbp('sbp/selectors/register', {
  'gi.actions/group/create': async function ({
    data: {
      name,
      picture,
      sharedValues,
      mincomeAmount,
      mincomeCurrency,
      ruleName,
      ruleThreshold
    },
    options: { sync = true } = {},
    publishOptions
  }) {
    let finalPicture = `${window.location.origin}/assets/images/group-avatar-default.png`

    if (picture) {
      try {
        finalPicture = await imageUpload(picture)
      } catch (e) {
        console.error('actions/group.js failed to upload the group picture', e)
        throw new GIErrorUIRuntimeError(L('Failed to upload the group picture. {codeError}', { codeError: e.message }))
      }
    }

    try {
      const initialInvite = createInvite({ quantity: 60, creator: INVITE_INITIAL_CREATOR })
      const proposalSettings = {
        rule: ruleName,
        ruleSettings: {
          [ruleName]: {
            threshold: +ruleThreshold // ensure this is a number
          }
        }
      }
      const message = await sbp('chelonia/out/registerContract', {
        contractName: 'gi.contracts/group',
        publishOptions,
        data: {
          invites: {
            [initialInvite.inviteSecret]: initialInvite
          },
          settings: {
            // authorizations: [contracts.CanModifyAuths.dummyAuth()], // TODO: this
            groupName: name,
            groupPicture: finalPicture,
            sharedValues,
            mincomeAmount: +mincomeAmount,
            mincomeCurrency: mincomeCurrency,
            proposals: {
              [PROPOSAL_GROUP_SETTING_CHANGE]: merge(
                merge({}, proposals[PROPOSAL_GROUP_SETTING_CHANGE].defaults),
                proposalSettings
              ),
              [PROPOSAL_INVITE_MEMBER]: merge(
                merge({}, proposals[PROPOSAL_INVITE_MEMBER].defaults),
                proposalSettings
              ),
              [PROPOSAL_REMOVE_MEMBER]: merge(
                merge({}, proposals[PROPOSAL_REMOVE_MEMBER].defaults),
                proposalSettings
              ),
              [PROPOSAL_PROPOSAL_SETTING_CHANGE]: merge(
                merge({}, proposals[PROPOSAL_PROPOSAL_SETTING_CHANGE].defaults),
                proposalSettings
              ),
              [PROPOSAL_GENERIC]: merge(
                merge({}, proposals[PROPOSAL_GENERIC].defaults),
                proposalSettings
              )
            }
          }
        }
      })

      if (sync) {
        await sbp('gi.actions/contract/syncAndWait', message.contractID())
      }

      return message
    } catch (e) {
      console.error('gi.actions/group/create failed!', e)
      throw new GIErrorUIRuntimeError(L('Failed to create the group: {reportError}', LError(e)))
    }
  },
  'gi.actions/group/createAndSwitch': async function (params: GIActionParams) {
    const message = await sbp('gi.actions/group/create', params)
    sbp('gi.actions/group/switch', message.contractID())
    return message
  },
  'gi.actions/group/join': async function (params: GIActionParams) {
    try {
      // post acceptance event to the group contract
      const message = await sbp('chelonia/out/actionEncrypted', {
        action: 'gi.contracts/group/inviteAccept', ...params
      })
      // sync the group's contract state
      await sbp('state/enqueueContractSync', params.contractID)
      return message
    } catch (e) {
      console.error('gi.actions/group/join failed!', e)
      throw new GIErrorUIRuntimeError(L('Failed to join the group: {codeError}', { codeError: e.message }))
    }
  },
  'gi.actions/group/inviteRevoke': function (params: GIActionParams): Promise {
    try {
      return sbp('chelonia/out/actionEncrypted', {
        action: 'gi.contracts/group/inviteRevoke', ...params
      })
    } catch (e) {
      console.error('gi.actions/group/inviteRevoke failed!', e)
      throw new GIErrorUIRuntimeError(L('Failed to revoke invite. {reportError}', LError(e)))
    }
  },
  'gi.actions/group/joinAndSwitch': async function (params: GIActionParams) {
    const message = await sbp('gi.actions/group/join', params)
    // after joining, we can set the current group
    sbp('gi.actions/group/switch', message.contractID())
    return message
  },
  'gi.actions/group/switch': function (groupId) {
    sbp('state/vuex/commit', 'setCurrentGroupId', groupId)
  },
  'gi.actions/group/payment': async function (info, groupId) {
    try {
      const message = await sbp('gi.contracts/group/payment/create', info, groupId)
      await sbp('backend/publishLogEntry', message)
      return message
    } catch (e) {
      console.error('gi.actions/group/payment failed!', e)
      throw new GIErrorUIRuntimeError(L('Failed to create payment. {reportError}', LError(e)))
    }
  },
  'gi.actions/group/paymentUpdate': async function (info, groupId) {
    try {
      const message = await sbp('gi.contracts/group/paymentUpdate/create', info, groupId)
      await sbp('backend/publishLogEntry', message)
      return message
    } catch (e) {
      console.error('gi.actions/group/payment failed!', e)
      throw new GIErrorUIRuntimeError(L('Failed to update payment. {reportError}', LError(e)))
    }
  },
  'gi.actions/group/groupProfileUpdate': async function (settings, groupId) {
    try {
      const message = await sbp('gi.contracts/group/groupProfileUpdate/create', settings, groupId)
      await sbp('backend/publishLogEntry', message)
      return message
    } catch (e) {
      console.error('gi.actions/group/groupProfileUpdate failed!', e)
      throw new GIErrorUIRuntimeError(L('Failed to update group profile. {reportError}', LError(e)))
    }
  },
  'gi.actions/group/proposal': async function (proposalInfo, groupId) {
    try {
      const message = await sbp('gi.contracts/group/proposal/create', proposalInfo, groupId)
      await sbp('backend/publishLogEntry', message)
      return message
    } catch (e) {
      console.error('gi.actions/group/proposal failed!', e)
      throw new GIErrorUIRuntimeError(L('Failed to create proposal. {reportError}', LError(e)))
    }
  },
  'gi.actions/group/proposalVote': async function (voteInfo, groupId) {
    try {
      const message = await sbp('gi.contracts/group/proposalVote/create', voteInfo, groupId)
      await sbp('backend/publishLogEntry', message)
      return message
    } catch (e) {
      console.error('gi.actions/group/proposalVote failed!', e)
      throw new GIErrorUIRuntimeError(L('Failed to vote on proposal. {reportError}', LError(e)))
    }
  },
  'gi.actions/group/proposalCancel': async function (data, groupId) {
    try {
      const message = await sbp('gi.contracts/group/proposalCancel/create', data, groupId)
      await sbp('backend/publishLogEntry', message)
      return message
    } catch (e) {
      console.error('gi.actions/group/proposalVote failed!', e)
      throw new GIErrorUIRuntimeError(L('Failed to cancel proposal. {reportError}', LError(e)))
    }
  },
  'gi.actions/group/updateSettings': async function (settings, groupId) {
    try {
      const message = await sbp('gi.contracts/group/updateSettings/create', settings, groupId)
      await sbp('backend/publishLogEntry', message)
      return message
    } catch (e) {
      console.error('gi.actions/group/updateSettings failed!', e)
      throw new GIErrorUIRuntimeError(L('Failed to update group settings. {reportError}', LError(e)))
    }
  },
  'gi.actions/group/removeMember': async function (params, groupID) {
    try {
      const message = await sbp('gi.contracts/group/removeMember/create', params, groupID)
      await sbp('backend/publishLogEntry', message)
      return message
    } catch (e) {
      console.error('gi.actions/group/removeMember failed', e)
      throw new GIErrorUIRuntimeError(L('Failed to remove {member}: {reportError}', { member: params.member, ...LError(e) }))
    }
  },
  'gi.actions/group/removeOurselves': async function (groupId) {
    try {
      const message = await sbp('gi.contracts/group/removeOurselves/create', {}, groupId)
      await sbp('backend/publishLogEntry', message)
      return message
    } catch (e) {
      console.error('gi.actions/group/leaveGroup failed', e)
      throw new GIErrorUIRuntimeError(L('Failed to leave group. {codeError}', { codeError: e.message }))
    }
  },
  'gi.actions/group/updateAllVotingRules': async function (params, groupId) {
    try {
      const message = await sbp('gi.contracts/group/updateAllVotingRules/create', params, groupId)
      await sbp('backend/publishLogEntry', message)
      return message
    } catch (e) {
      console.error('gi.actions/group/leaveGroup failed', e)
      throw new GIErrorUIRuntimeError(L('Failed to update voting rules. {codeError}', { codeError: e.message }))
    }
  }
}): any)
