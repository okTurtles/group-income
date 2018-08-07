import L from '../../utils/translations'
import contracts from '../../../model/contracts.js'
const { TypeInvitation, TypeRemoval, TypeIncome, TypeChangeThreshold, TypeApprovalThreshold, TypeRemovalThreshold } = contracts.GroupProposal

const changeButtonText = {
  for: (proposalData, originalData) => L('Change to {proposalData}{originalData}', proposalData, originalData),
  against: (proposalData, originalData) => L('Keep {originalData}{proposalData}', proposalData, originalData)
}

export default {
  [TypeInvitation]: {
    title: () => L('Invite Member'),
    text: (proposer, proposalData, originalData) => L('{proposer} proposed to <strong>invite {proposalData}</strong> to the group {originalData}', proposer, proposalData, originalData),
    button: {
      for: (proposalData) => L('Invite {proposalData}', proposalData),
      against: () => L('Don\'t invite')
    }
  },
  [TypeRemoval]: {
    title: () => L('Remove Member'),
    text: (proposer, proposalData, originalData) => L('{proposer} proposed to <strong>remove {proposalData}</strong> from the group {originalData}', proposer, proposalData, originalData),
    button: {
      for: (proposalData) => L('Remove {proposalData}', proposalData),
      against: (originalData) => L('Keep {originalData}', originalData)
    }
  },
  [TypeIncome]: {
    title: () => L('Change Mincome'),
    text: (proposer, proposalData, originalData) => L('{proposer} proposed to change the <strong>mincome from {originalData} to {proposalData}</strong>', proposer, proposalData, originalData),
    button: changeButtonText
  },
  [TypeChangeThreshold]: {
    title: () => L('Update Rule: Change Threshold'),
    text: (proposer, proposalData, originalData) => L('{proposer} proposed to change the <strong>rule changing threshold from {originalData} to {proposalData}</strong>', proposer, proposalData, originalData),
    action: () => L('change a rule'),
    button: changeButtonText
  },
  [TypeApprovalThreshold]: {
    title: () => L('Update Rule: Invite Threshold'),
    text: (proposer, proposalData, originalData) => L('{proposer} proposed to change the <strong>member invite threshold from {originalData} to {proposalData}</strong>', proposer, proposalData, originalData),
    action: () => L('approve a new member'),
    button: changeButtonText
  },
  [TypeRemovalThreshold]: {
    title: () => L('Update Rule: Member Removal Threshold'),
    text: (proposer, proposalData, originalData) => L('{proposer} proposed to change the <strong>member removal threshold from {originalData} to {proposalData}</strong>', proposer, proposalData, originalData),
    action: () => L('remove a member'),
    button: changeButtonText
  }
}
