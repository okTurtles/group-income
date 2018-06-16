import contracts from '../../model/contracts.js'
const { TypeInvitation, TypeRemoval, TypeIncome, TypeChangeThreshold, TypeApprovalThreshold, TypeRemovalThreshold } = contracts.GroupProposal

export const votingType = (type: String) => [TypeInvitation, TypeRemoval, TypeIncome, TypeChangeThreshold, TypeApprovalThreshold, TypeRemovalThreshold].includes(type)
export const votesObj = (votes: String) => ( // total, received, threshold
  votes.total && Number.isInteger(votes.total) &&
  Number.isInteger(votes.received)
)
