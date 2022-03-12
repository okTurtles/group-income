'use strict'

import sbp from '~/shared/sbp.js'
import { createInvite } from '@model/contracts/group.js'
import {
  INVITE_INITIAL_CREATOR,
  CHATROOM_GENERAL_NAME,
  CHATROOM_TYPES,
  CHATROOM_PRIVACY_LEVEL
} from '@model/contracts/constants.js'
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
import { encryptedAction } from './utils.js'
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

      // create a 'General' chatroom contract and let the creator join
      await sbp('gi.actions/group/addAndJoinChatRoom', {
        contractID: message.contractID(),
        data: {
          attributes: {
            name: CHATROOM_GENERAL_NAME,
            type: CHATROOM_TYPES.GROUP,
            description: '',
            privacyLevel: CHATROOM_PRIVACY_LEVEL.GROUP
          }
        }
      })

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
  'gi.actions/group/join': async function (params: $Exact<GIActionParams>) {
    try {
      // post acceptance event to the group contract
      const message = await sbp('chelonia/out/actionEncrypted', {
        action: 'gi.contracts/group/inviteAccept', ...params
      })
      // sync the group's contract state
      await sbp('state/enqueueContractSync', params.contractID)

      // join the 'General' chatroom by default
      const rootState = sbp('state/vuex/state')
      const generalChatRoomId = rootState[params.contractID].generalChatRoomId
      if (generalChatRoomId) {
        await sbp('gi.actions/group/joinChatRoom', {
          contractID: params.contractID,
          data: { chatRoomID: generalChatRoomId }
        })
      }

      return message
    } catch (e) {
      console.error('gi.actions/group/join failed!', e)
      throw new GIErrorUIRuntimeError(L('Failed to join the group: {codeError}', { codeError: e.message }))
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
  'gi.actions/group/addChatRoom': async function (params: GIActionParams) {
    const message = await sbp('gi.actions/chatroom/create', { data: params.data })

    await sbp('chelonia/out/actionEncrypted', {
      ...params,
      action: 'gi.contracts/group/addChatRoom',
      data: {
        ...params.data,
        chatRoomID: message.contractID()
      }
    })

    return message
  },
  'gi.actions/group/joinChatRoom': async function (params: GIActionParams) {
    try {
      const rootState = sbp('state/vuex/state')
      const username = params.data.username || rootState.loggedIn.username
      await sbp('gi.actions/chatroom/join', {
        contractID: params.data.chatRoomID,
        data: { username }
      })

      if (username === rootState.loggedIn.username) {
        sbp('okTurtles.data/set', 'READY_TO_JOIN_CHATROOM', true)
      }
      await sbp('chelonia/out/actionEncrypted', {
        ...params,
        action: 'gi.contracts/group/joinChatRoom'
      })
      sbp('okTurtles.data/set', 'READY_TO_JOIN_CHATROOM', false)
    } catch (e) {
      console.error('gi.actions/group/joinChatRoom failed!', e)
      throw new GIErrorUIRuntimeError(L('Failed to join chat channel.'))
    }
  },
  'gi.actions/group/addAndJoinChatRoom': async function (params: GIActionParams) {
    const message = await sbp('gi.actions/group/addChatRoom', {
      ...params, hooks: { prepublish: params.hooks?.prepublish, postpublish: null }
    })

    await sbp('gi.actions/group/joinChatRoom', {
      ...params,
      data: { chatRoomID: message.contractID() },
      hooks: { prepublish: null, postpublish: params.hooks?.postpublish }
    })

    return message
  },
  'gi.actions/group/renameChatRoom': function (params: GIActionParams) {
    sbp('gi.actions/chatroom/rename', {
      contractID: params.data.chatRoomID,
      data: { name: params.data.name }
    })

    sbp('chelonia/out/actionEncrypted', {
      ...params,
      hooks: { prepublish: null, postpublish: params.hooks?.postpublish },
      action: 'gi.contracts/group/renameChatRoom'
    })
  },
  'gi.actions/group/leaveChatRooms': function (params: GIActionParams) {
    const { username, member, chatRoomIDsToLeave } = params.options || {}
    for (const contractID of chatRoomIDsToLeave) {
      sbp('gi.actions/chatroom/leave', { contractID, data: { username, member } })
    }
  },
  ...encryptedAction('gi.actions/group/deleteChatRoom', L('Failed to delete chat channel.')),
  ...encryptedAction('gi.actions/group/inviteRevoke', L('Failed to revoke invite.')),
  ...encryptedAction('gi.actions/group/payment', L('Failed to create payment.')),
  ...encryptedAction('gi.actions/group/paymentUpdate', L('Failed to update payment.')),
  ...encryptedAction('gi.actions/group/groupProfileUpdate', L('Failed to update group profile.')),
  ...encryptedAction('gi.actions/group/proposal', L('Failed to create proposal.')),
  ...encryptedAction('gi.actions/group/proposalVote', L('Failed to vote on proposal.')),
  ...encryptedAction('gi.actions/group/proposalCancel', L('Failed to cancel proposal.')),
  ...encryptedAction('gi.actions/group/updateSettings', L('Failed to update group settings.')),
  ...encryptedAction('gi.actions/group/removeMember', (params, e) => L('Failed to remove {member}: {reportError}', { member: params.member, ...LError(e) })),
  ...encryptedAction('gi.actions/group/removeOurselves', (params, e) => L('Failed to leave group. {codeError}', { codeError: e.message })),
  ...encryptedAction('gi.actions/group/updateAllVotingRules', (params, e) => L('Failed to update voting rules. {codeError}', { codeError: e.message }))
}): string[])
