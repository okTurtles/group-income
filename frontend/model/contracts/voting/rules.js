'use strict'

import { literalOf, unionOf } from '~/frontend/utils/flowTyper.js'

import { PROPOSAL_REMOVE_MEMBER } from '~/frontend/model/contracts/voting/constants.js'

export const VOTE_AGAINST = ':against'
export const VOTE_INDIFFERENT = ':indifferent'
export const VOTE_UNDECIDED = ':undecided'
export const VOTE_FOR = ':for'

export const RULE_PERCENTAGE = 'percentage'
export const RULE_DISAGREEMENT = 'disagreement'
export const RULE_MULTI_CHOICE = 'multi-choice'

// TODO: ranked-choice? :D

const rules = {
  [RULE_PERCENTAGE]: function (state, proposalType, votes) {
    votes = Object.values(votes)
    const population = Object.keys(state.profiles).length
    const defaultThreshold = state.settings.proposals[proposalType].ruleSettings[RULE_PERCENTAGE].threshold
    const threshold = proposalType === PROPOSAL_REMOVE_MEMBER
      ? Math.min(defaultThreshold, (population - 1) / population)
      : defaultThreshold
    const totalIndifferent = votes.filter(x => x === VOTE_INDIFFERENT).length
    const totalFor = votes.filter(x => x === VOTE_FOR).length
    const totalAgainst = votes.filter(x => x === VOTE_AGAINST).length
    const totalForOrAgainst = totalFor + totalAgainst
    const turnout = totalForOrAgainst + totalIndifferent
    const absent = population - turnout
    // TODO: figure out if this is the right way to figure out the "neededToPass" number
    //       and if so, explain it in the UI that the threshold is applied only to
    //       *those who care, plus those who were abscent*.
    //       Those who explicitely say they don't care are removed from consideration.
    // TODO: if we're doing it this way we should never allow the threshold to go below
    //       60%, since anything near that range indicates disagreement among the voting
    //       group (which can be very small if we allow an explicit third option.)
    const neededToPass = Math.ceil(threshold * (population - totalIndifferent))
    console.debug(`votingRule ${RULE_PERCENTAGE} for ${proposalType}:`, { neededToPass, totalFor, totalAgainst, totalIndifferent, threshold, absent, turnout, population })
    if (totalFor >= neededToPass) {
      return VOTE_FOR
    }
    return totalFor + absent < neededToPass ? VOTE_AGAINST : VOTE_UNDECIDED
  },
  [RULE_DISAGREEMENT]: function (state, proposalType, votes) {
    votes = Object.values(votes)
    const minimumMax = proposalType === PROPOSAL_REMOVE_MEMBER ? 2 : 0
    const threshold = Math.max(state.settings.proposals[proposalType].ruleSettings[RULE_DISAGREEMENT].threshold, minimumMax)
    const totalFor = votes.filter(x => x === VOTE_FOR).length
    const totalAgainst = votes.filter(x => x === VOTE_AGAINST).length
    const population = Object.keys(state.profiles).length
    const turnout = votes.length
    const absent = population - turnout
    // const thresholdAdjusted = getThresholdAdjusted(threshold, groupSize) TODO in a next PR.

    console.debug(`votingRule ${RULE_DISAGREEMENT} for ${proposalType}:`, { totalFor, totalAgainst, threshold, turnout, population, absent })
    if (totalAgainst >= threshold) {
      return VOTE_AGAINST
    }
    // consider proposal passed if more vote for it than against it and there aren't
    // enough votes left to tip the scales past the threshold
    return totalAgainst + absent < threshold && totalFor > totalAgainst ? VOTE_FOR : VOTE_UNDECIDED
  },
  [RULE_MULTI_CHOICE]: function (state, proposalType, votes) {
    throw new Error('unimplemented!')
    // TODO: return VOTE_UNDECIDED if 0 votes, otherwise value w/greatest number of votes
    //       the proposal/poll is considered passed only after the expiry time period
    // NOTE: are we sure though that this even belongs here as a voting rule...?
    //       perhaps there could be a situation were one of several valid settings options
    //       is being proposed... in effect this would be a plurality voting rule
  }
}

export default rules

export const ruleType = unionOf(...Object.keys(rules).map(k => literalOf(k)))

/**
 *
 * @example ('disagreement', 2, 1) => 2
 * @example ('disagreement', 5, 1) => 3
 * @example ('disagreement', 7, 10) => 7
 * @example ('disagreement', 20, 10) => 10
 *
 * @example ('percentage', 0.5, 3) => 0.5
 * @example ('percentage', 0.1, 3) => 0.33
 * @example ('percentage', 0.1, 10) => 0.2
 * @example ('percentage', 0.3, 10) => 0.3
 */
export const getThresholdAdjusted = (rule, threshold, groupSize) => {
  const groupSizeVoting = Math.max(3, groupSize) // 3 = minimum groupSize to vote

  if (rule === RULE_DISAGREEMENT) {
    // Maximum "no" votes correspondent to group size
    return Math.min(groupSizeVoting, threshold)
  }

  if (rule === RULE_PERCENTAGE) {
    // Minimum threshold correspondent to 2 "yes" votes
    const minThreshold = 2 / groupSizeVoting
    return Math.max(minThreshold, threshold)
  }
}
