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
import { merge, omit } from '@utils/giLodash.js'
import { dateToPeriodStamp, addTimeToDate, DAYS_MILLIS } from '@utils/time.js'
import L, { LError } from '@view-utils/translations.js'
import { encryptedAction } from './utils.js'
import type { GIActionParams } from './types.js'

export async function leaveAllChatRooms (groupContractID: string, member: string) {
  // let user leaves all the chatrooms before leaving group
  const rootState = sbp('state/vuex/state')
  const chatRooms = rootState[groupContractID].chatRooms
  const chatRoomIDsToLeave = Object.keys(chatRooms)
    .filter(cID => chatRooms[cID].users.includes(member))

  try {
    for (const chatRoomID of chatRoomIDsToLeave) {
      await sbp('gi.actions/group/leaveChatRoom', {
        contractID: groupContractID,
        data: { chatRoomID, member, leavingGroup: true }
      })
    }
  } catch (e) {
    console.error(`leaveAllChatRooms: ${e.name}: ${e.message}`, e)
    throw new GIErrorUIRuntimeError(L('Failed to leave chat channel.'))
  }
}

export default (sbp('sbp/selectors/register', {
  'gi.actions/group/create': async function ({
    data: {
      name,
      picture,
      sharedValues,
      mincomeAmount,
      mincomeCurrency,
      ruleName,
      ruleThreshold,
      distributionDate
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
      if (!distributionDate) {
        // 3 days after group creation by default. we put this here for a kind of dumb but
        // necessary reason: the Cypress tests do not allow us to import dateToPeriodStamp
        // or any of these other time.js functions because thte Cypress environment can't
        // handle Flowtype annotations, even though our .babelrc should make it work.
        distributionDate = dateToPeriodStamp(addTimeToDate(new Date(), 3 * DAYS_MILLIS))
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
            distributionDate,
            minimizeDistribution: true,
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
        ...omit(params, ['options']),
        action: 'gi.contracts/group/inviteAccept',
        hooks: {
          prepublish: params.hooks?.prepublish,
          postpublish: null
        }
      })
      // sync the group's contract state
      await sbp('state/enqueueContractSync', params.contractID)

      // join the 'General' chatroom by default
      const rootState = sbp('state/vuex/state')
      const generalChatRoomId = rootState[params.contractID].generalChatRoomId
      if (generalChatRoomId) {
        await sbp('gi.actions/group/joinChatRoom', {
          ...omit(params, ['options']),
          data: {
            chatRoomID: generalChatRoomId
          },
          hooks: {
            prepublish: null,
            postpublish: params.hooks?.postpublish
          }
        })
      } else {
        alert(L("Couldn't join the #{chatroomName} in the group. Doesn't exist.", { chatroomName: CHATROOM_GENERAL_NAME }))
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
    const message = await sbp('gi.actions/chatroom/create', {
      data: params.data,
      hooks: {
        prepublish: params.hooks?.prepublish,
        postpublish: null
      }
    })

    await sbp('chelonia/out/actionEncrypted', {
      ...omit(params, ['options']),
      action: 'gi.contracts/group/addChatRoom',
      data: {
        ...params.data,
        chatRoomID: message.contractID()
      },
      hooks: {
        prepublish: null,
        postpublish: params.hooks?.postpublish
      }
    })

    return message
  },
  'gi.actions/group/joinChatRoom': async function (params: GIActionParams) {
    try {
      const rootState = sbp('state/vuex/state')
      const username = params.data.username || rootState.loggedIn.username
      const message = await sbp('gi.actions/chatroom/join', {
        ...omit(params, ['options']),
        contractID: params.data.chatRoomID,
        data: { username },
        hooks: {
          prepublish: params.hooks?.prepublish,
          postpublish: null
        }
      })

      if (username === rootState.loggedIn.username) {
        // 'READY_TO_JOIN_CHATROOM' is necessary to identify the joining chatroom action is NEW or OLD
        // Users join the chatroom thru group making group actions
        // But when user joins the group, he needs to ignore all the actions about chatroom
        // Because the user is joining group, not joining chatroom
        // and he is going to make a new action to join 'General' chatroom AGAIN
        // While joining group, we don't set this flag because Joining chatroom actions are all OLD ones, which needs to be ignored
        // Joining 'General' chatroom is one of the step to join group
        // So setting 'READY_TO_JOIN_CHATROOM' can not be out of the 'JOINING_GROUP' scope
        sbp('okTurtles.data/set', 'READY_TO_JOIN_CHATROOM', true)
      }
      await sbp('chelonia/out/actionEncrypted', {
        ...omit(params, ['options']),
        action: 'gi.contracts/group/joinChatRoom',
        hooks: {
          prepublish: null,
          postpublish: params.hooks?.postpublish
        }
      })
      return message
    } catch (e) {
      console.error('gi.actions/group/joinChatRoom failed!', e)
      throw new GIErrorUIRuntimeError(L('Failed to join chat channel.'))
    }
  },
  'gi.actions/group/addAndJoinChatRoom': async function (params: GIActionParams) {
    const message = await sbp('gi.actions/group/addChatRoom', {
      ...omit(params, ['options']),
      hooks: {
        prepublish: params.hooks?.prepublish,
        postpublish: null
      }
    })

    await sbp('gi.actions/group/joinChatRoom', {
      ...omit(params, ['options']),
      data: {
        chatRoomID: message.contractID()
      },
      hooks: {
        prepublish: (msg) => {
          sbp('okTurtles.events/once', msg.hash(), (cId, m) => {
            sbp('state/vuex/commit', 'setCurrentChatRoomId', { chatRoomId: cId })
          })
        },
        postpublish: params.hooks?.postpublish
      }
    })

    return message
  },
  'gi.actions/group/renameChatRoom': async function (params: GIActionParams) {
    try {
      await sbp('gi.actions/chatroom/rename', {
        ...omit(params, ['options']),
        contractID: params.data.chatRoomID,
        data: {
          name: params.data.name
        },
        hooks: {
          prepublish: params.hooks?.prepublish,
          postpublish: null
        }
      })

      return await sbp('chelonia/out/actionEncrypted', {
        ...omit(params, ['options']),
        action: 'gi.contracts/group/renameChatRoom',
        hooks: {
          prepublish: null,
          postpublish: params.hooks?.postpublish
        }
      })
    } catch (e) {
      console.error('gi.actions/group/renameChatRoom failed!', e)
      throw new GIErrorUIRuntimeError(L('Failed to rename chat channel.'))
    }
  },
  'gi.actions/group/removeMember': async function (params: GIActionParams) {
    await leaveAllChatRooms(params.contractID, params.data.member)

    try {
      return await sbp('chelonia/out/actionEncrypted', {
        ...omit(params, ['options']),
        action: 'gi.contracts/group/removeMember'
      })
    } catch (e) {
      throw new GIErrorUIRuntimeError(L('Failed to remove {member}: {reportError}', { member: params.data.member, ...LError(e) }))
    }
  },
  'gi.actions/group/removeOurselves': async function (params: GIActionParams) {
    const rootState = sbp('state/vuex/state')
    await leaveAllChatRooms(params.contractID, rootState.loggedIn.username)

    try {
      return await sbp('chelonia/out/actionEncrypted', {
        ...omit(params, ['options']),
        action: 'gi.contracts/group/removeOurselves'
      })
    } catch (e) {
      throw new GIErrorUIRuntimeError(L('Failed to leave group. {codeError}', { codeError: e.message }))
    }
  },
  ...encryptedAction('gi.actions/group/leaveChatRoom', L('Failed to leave chat channel.')),
  ...encryptedAction('gi.actions/group/deleteChatRoom', L('Failed to delete chat channel.')),
  ...encryptedAction('gi.actions/group/inviteRevoke', L('Failed to revoke invite.')),
  ...encryptedAction('gi.actions/group/payment', L('Failed to create payment.')),
  ...encryptedAction('gi.actions/group/paymentUpdate', L('Failed to update payment.')),
  ...encryptedAction('gi.actions/group/groupProfileUpdate', L('Failed to update group profile.')),
  ...encryptedAction('gi.actions/group/proposal', L('Failed to create proposal.')),
  ...encryptedAction('gi.actions/group/proposalVote', L('Failed to vote on proposal.')),
  ...encryptedAction('gi.actions/group/proposalCancel', L('Failed to cancel proposal.')),
  ...encryptedAction('gi.actions/group/updateSettings', L('Failed to update group settings.')),
  ...encryptedAction('gi.actions/group/updateAllVotingRules', (params, e) => L('Failed to update voting rules. {codeError}', { codeError: e.message })),
  ...((process.env.NODE_ENV === 'development' || process.env.CI) && {
    ...encryptedAction('gi.actions/group/forceDistributionDate', L('Failed to force distribution date.'))
  })
}): string[])
