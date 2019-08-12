'use strict'

import { literalOf, unionOf } from '~/frontend/utils/flowTyper.js'

export const VOTE_AGAINST = -1
export const VOTE_INDIFFERENT = 0
export const VOTE_FOR = 1

export const voteType = unionOf(...[VOTE_AGAINST, VOTE_INDIFFERENT, VOTE_FOR].map(k => literalOf(k)))

export const RULE_THRESHOLD = 'threshold'
export const RULE_DISAGREEMENT = 'disagreement'

const rules = {
  // if this is not a deciding vote, return VOTE_INDIFFERENT
  [RULE_THRESHOLD]: function (state, proposalType, votes) {
    const threshold = state.settings.proposals[proposalType].ruleSettings[RULE_THRESHOLD].threshold
    const totalIndifferent = Object.values(votes).filter(x => x === VOTE_INDIFFERENT).length
    const totalFor = Object.values(votes).filter(x => x === VOTE_FOR).length
    const totalAgainst = Object.values(votes).filter(x => x === VOTE_AGAINST).length
    const totalForOrAgainst = totalFor + totalAgainst
    const population = Object.keys(state.profiles).length
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
    console.debug(`votingRule ${RULE_THRESHOLD} for ${proposalType}:`, { neededToPass, totalFor, totalAgainst, totalIndifferent, threshold, absent, turnout, population })
    if (totalFor >= neededToPass) {
      return VOTE_FOR
    }
    return totalFor + absent < neededToPass ? VOTE_AGAINST : VOTE_INDIFFERENT
  },
  [RULE_DISAGREEMENT]: function (state, proposalType, votes) {
    const disagreementThreshold = state.settings.proposals[proposalType].ruleSettings[RULE_DISAGREEMENT].threshold
    const totalAgainst = Object.values(votes).filter(x => x === VOTE_AGAINST).length
    console.debug(`votingRule ${RULE_DISAGREEMENT} for ${proposalType}:`, { totalAgainst, disagreementThreshold })
    return totalAgainst >= disagreementThreshold ? VOTE_AGAINST : VOTE_INDIFFERENT
  }
}

export default rules

export const ruleType = unionOf(...Object.keys(rules).map(k => literalOf(k)))
