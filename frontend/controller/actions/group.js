import sbp from '~/shared/sbp.js'
import {
  INVITE_INITIAL_CREATOR,
  createInvite
} from '@model/contracts/group.js'
import proposals, {
  PROPOSAL_INVITE_MEMBER,
  PROPOSAL_REMOVE_MEMBER,
  PROPOSAL_GROUP_SETTING_CHANGE,
  PROPOSAL_PROPOSAL_SETTING_CHANGE,
  PROPOSAL_GENERIC
} from '@model/contracts/voting/proposals.js'
import { RULE_THRESHOLD } from '@model/contracts/voting/rules.js'
import { GIErrorUIRuntimeError } from '@model/errors.js'

import imageUpload from '@utils/imageUpload.js'
import { merge } from '@utils/giLodash.js'
// import { CONTRACT_IS_SYNCING } from '@utils/events.js'
import L from '@view-utils/translations.js'

export default sbp('sbp/selectors/register', {
  'gi.actions/group/create': async function ({
    name,
    picture,
    sharedValues,
    mincomeAmount,
    mincomeCurrency,
    thresholdChange,
    thresholdMemberApproval,
    thresholdMemberRemoval
  }, {
    sync = true
  } = {}) {
    let finalPicture = `${window.location.origin}/assets/images/default-group-avatar.png`

    if (picture) {
      try {
        finalPicture = await imageUpload(picture)
      } catch (e) {
        console.error('Failed to upload the group picture', e)
        throw new GIErrorUIRuntimeError(L('Failed to upload the group picture. {codeError}', { codeError: e.message }))
      }
    }

    try {
      const initialInvite = createInvite({ quantity: 60, creator: INVITE_INITIAL_CREATOR })
      const entry = await sbp('gi.contracts/group/create', {
        invites: {
          [initialInvite.inviteSecret]: initialInvite
        },
        settings: {
          // authorizations: [contracts.CanModifyAuths.dummyAuth()], // TODO: this
          groupName: name,
          groupPicture: finalPicture,
          sharedValues,
          mincomeAmount: +mincomeAmount, // ensure this is a number
          mincomeCurrency: mincomeCurrency,
          proposals: {
            // TODO: make the UI support changing the rule type, so that we have
            //       a component for RULE_DISAGREEMENT as well
            [PROPOSAL_GROUP_SETTING_CHANGE]: merge({},
              proposals[PROPOSAL_GROUP_SETTING_CHANGE].defaults,
              { ruleSettings: { [RULE_THRESHOLD]: { threshold: thresholdChange } } }
            ),
            [PROPOSAL_INVITE_MEMBER]: merge({},
              proposals[PROPOSAL_INVITE_MEMBER].defaults,
              { ruleSettings: { [RULE_THRESHOLD]: { threshold: thresholdMemberApproval } } }
            ),
            [PROPOSAL_REMOVE_MEMBER]: merge({},
              proposals[PROPOSAL_REMOVE_MEMBER].defaults,
              { ruleSettings: { [RULE_THRESHOLD]: { threshold: thresholdMemberRemoval } } }
            ),
            [PROPOSAL_PROPOSAL_SETTING_CHANGE]: proposals[PROPOSAL_PROPOSAL_SETTING_CHANGE].defaults,
            [PROPOSAL_GENERIC]: proposals[PROPOSAL_GENERIC].defaults
          }
        }
      })
      const groupId = entry.hash()

      await sbp('backend/publishLogEntry', entry)

      if (sync) {
        await sbp('gi.actions/contract/syncAndWait', groupId)
      }

      return groupId
    } catch (e) {
      console.error('gi.actions/group/create failed!', e)
      throw new GIErrorUIRuntimeError(L('Failed to create the group: {codeError}', { codeError: e.message }))
    }
  },
  'gi.actions/group/createAndSwitch': async function (groupParams) {
    const groupID = await sbp('gi.actions/group/create', groupParams, { sync: true })
    sbp('gi.actions/group/switch', groupID)
    return groupID
  },
  'gi.actions/group/join': async function ({ groupId, inviteSecret }) {
    try {
      // post acceptance event to the group contract
      const acceptance = await sbp('gi.contracts/group/inviteAccept/create',
        { inviteSecret },
        groupId
      )
      // let the group know we've accepted their invite
      await sbp('backend/publishLogEntry', acceptance)
      // sync the group's contract state
      await sbp('state/enqueueContractSync', groupId)
      return groupId
    } catch (e) {
      console.error('gi.actions/group/join failed!', e)
      throw new GIErrorUIRuntimeError(L('Failed to join the group: {codeError}', { codeError: e.message }))
    }
  },
  'gi.actions/group/joinAndSwitch': async function (joinParams) {
    const groupId = await sbp('gi.actions/group/join', joinParams)
    // after joining, we can set the current group
    sbp('gi.actions/group/switch', groupId)
    return groupId
  },
  'gi.actions/group/switch': function (groupId) {
    sbp('state/vuex/commit', 'setCurrentGroupId', groupId)
  },
  'gi.actions/group/removeMember': async function (params, groupID) {
    try {
      const message = await sbp('gi.contracts/group/removeMember/create', params, groupID)
      await sbp('backend/publishLogEntry', message)
    } catch (e) {
      console.error('gi.actions/group/removeMember failed', e)
      throw new GIErrorUIRuntimeError(L('Failed to remove {member}: {codeError}', { codeError: e.message, member: params.member }))
    }
    return true
  }
})
