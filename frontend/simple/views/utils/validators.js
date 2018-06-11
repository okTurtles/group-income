import contracts from '../../model/contracts.js'
const { TypeInvitation, TypeRemoval, TypeIncome, TypeChangeThreshold, TypeApprovalThreshold, TypeRemovalThreshold } = contracts.GroupProposal

export const nonWhitespace = (value: string) => /^\S+$/.test(value)

export const decimals = (digits: number) => (value: number) => Number.isInteger(value * Math.pow(10, digits))

export const votingType = (type: String) => [TypeInvitation, TypeRemoval, TypeIncome, TypeChangeThreshold, TypeApprovalThreshold, TypeRemovalThreshold].includes(type)

export const votesObj = (votes: String) => ( // total, received, threshold
  votes.total && Number.isInteger(votes.total) &&
  votes.received && Number.isInteger(votes.received) &&
  votes.threshold && !isNaN(votes.received)
)
