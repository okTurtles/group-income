import sbp from '~/shared/sbp.js'
import proposals, {
  PROPOSAL_INVITE_MEMBER,
  PROPOSAL_REMOVE_MEMBER,
  PROPOSAL_GROUP_SETTING_CHANGE,
  PROPOSAL_PROPOSAL_SETTING_CHANGE,
  PROPOSAL_GENERIC
} from '@model/contracts/voting/proposals.js'
import { RULE_THRESHOLD } from '@model/contracts/voting/rules.js'
import { INVITE_INITIAL_CREATOR, createInvite } from '@model/contracts/group.js'
import imageUpload from '@utils/imageUpload.js'
import { merge } from '@utils/giLodash.js'
import { GIErrorUIRuntimeError } from '@model/errors.js'
import L from '@view-utils/translations.js'

export default async function groupCreation ({
  name,
  picture,
  sharedValues,
  mincomeAmount,
  mincomeCurrency,
  thresholdChange,
  thresholdMemberApproval,
  thresholdMemberRemoval
}, cb) {
  let finalPicture = `${window.location.origin}/assets/images/default-group-avatar.png`

  if (picture) {
    try {
      finalPicture = await imageUpload(picture)
    } catch (e) {
      console.error('Failed to upload the group picture', e)
      throw new GIErrorUIRuntimeError(L('Failed to upload the group picture. {codeError}', { codeError: e.message }))
    }
  }

  // create the GroupContract
  try {
    const initialInvite = createInvite({ quantity: 60, creator: INVITE_INITIAL_CREATOR })
    const entry = sbp('gi.contracts/group/create', {
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
    const hash = entry.hash()
    sbp('okTurtles.events/once', hash, (contractID, entry) => {
      sbp('state/vuex/commit', 'setCurrentGroupId', hash)
      return cb ? cb() : true
    })
    await sbp('backend/publishLogEntry', entry)
    // add to vuex and monitor this contract for updates
    await sbp('state/enqueueContractSync', hash)
  } catch (e) {
    throw new GIErrorUIRuntimeError(L('Failed to create the group: {codeError}', { codeError: e.message }))
  }
}
