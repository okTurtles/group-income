'use strict'

import { literalOf, unionOf } from '~/frontend/utils/flowTyper.js'

export const VOTE_AGAINST = -1
export const VOTE_INDIFFERENT = 0
export const VOTE_FOR = 1

export const voteType = unionOf(literalOf(VOTE_AGAINST), literalOf(VOTE_INDIFFERENT), literalOf(VOTE_FOR))

export const RULE_THRESHOLD = 'threshold'

export const ruleType = unionOf(literalOf(RULE_THRESHOLD))

export const rules = {
  [RULE_THRESHOLD]: function (threshold, votes) {
    // if this is not a deciding vote, return VOTE_INDIFFERENT
  }
}
