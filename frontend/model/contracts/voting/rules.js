'use strict'

import { literalOf, unionOf } from '~/frontend/utils/flowTyper.js'

export const VOTE_AGAINST = ':against'
export const VOTE_INDIFFERENT = ':indifferent'
export const VOTE_UNDECIDED = ':undecided'
export const VOTE_FOR = ':for'

export const RULE_THRESHOLD = 'threshold'
export const RULE_DISAGREEMENT = 'disagreement'

const rules = {
  [RULE_THRESHOLD]: function (state, proposalType, votes) {
    votes = Object.values(votes)
    const threshold = state.settings.proposals[proposalType].ruleSettings[RULE_THRESHOLD].threshold
    const totalIndifferent = votes.filter(x => x === VOTE_INDIFFERENT).length
    const totalFor = votes.filter(x => x === VOTE_FOR).length
    const totalAgainst = votes.filter(x => x === VOTE_AGAINST).length
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
    return totalFor + absent < neededToPass ? VOTE_AGAINST : VOTE_UNDECIDED
  },
  [RULE_DISAGREEMENT]: function (state, proposalType, votes) {
    votes = Object.values(votes)
    const disagreementThreshold = state.settings.proposals[proposalType].ruleSettings[RULE_DISAGREEMENT].threshold
    const totalFor = votes.filter(x => x === VOTE_FOR).length
    const totalAgainst = votes.filter(x => x === VOTE_AGAINST).length
    const population = Object.keys(state.profiles).length
    const turnout = votes.length
    const absent = population - turnout
    console.debug(`votingRule ${RULE_DISAGREEMENT} for ${proposalType}:`, { totalFor, totalAgainst, disagreementThreshold, turnout, population, absent })
    if (totalAgainst >= disagreementThreshold) {
      return VOTE_AGAINST
    }
    return totalAgainst + absent < disagreementThreshold && totalFor > totalAgainst ? VOTE_FOR : VOTE_UNDECIDED
  }
}

export default rules

export const ruleType = unionOf(...Object.keys(rules).map(k => literalOf(k)))
