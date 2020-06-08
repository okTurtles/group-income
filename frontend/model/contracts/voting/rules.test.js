/* eslint-env mocha */
import rules, { RULE_PERCENTAGE, RULE_DISAGREEMENT, VOTE_FOR, VOTE_AGAINST, VOTE_UNDECIDED } from './rules.js'
import { PROPOSAL_REMOVE_MEMBER } from '~/frontend/model/contracts/voting/constants.js'
const should = require('should')

// Override console for a cleaner test output
console.log = () => true
console.debug = () => true

const buildState = (groupSize, rule, threshold, opts = {}) => {
  const { proposalType, membersInactive } = {
    proposalType: opts.proposalType || 'generic',
    membersInactive: opts.membersInactive || 0
  }
  return {
    profiles: (() => {
      const profiles = {}
      for (let i = 0; i < groupSize; i++) {
        profiles[`u${i}`] = { status: 'active' }
      }

      for (let i = 0; i < membersInactive; i++) {
        profiles[`u${i}`] = { status: '' }
      }

      return profiles
    })(),
    settings: {
      proposals: {
        [proposalType]: {
          ruleSettings: {
            [rule]: {
              threshold
            }
          }
        }
      }
    }
  }
}

// VF - Vote For
// VA - Vote Against

describe('5 members - RULE_PERCENTAGE - 70%', function () {
  const state = buildState(5, RULE_PERCENTAGE, 0.70)
  it('3VF returns undecided', () => {
    const result = rules[RULE_PERCENTAGE](state, 'generic', {
      u1: VOTE_FOR,
      u2: VOTE_FOR,
      u3: VOTE_FOR
    })
    should(result).equal(VOTE_UNDECIDED)
  })

  it('4VF returns for', () => {
    const result = rules[RULE_PERCENTAGE](state, 'generic', {
      u1: VOTE_FOR,
      u2: VOTE_FOR,
      u3: VOTE_FOR,
      u4: VOTE_FOR
    })
    should(result).equal(VOTE_FOR)
  })

  it('2VA returns against', () => {
    const result = rules[RULE_PERCENTAGE](state, 'generic', {
      u1: VOTE_AGAINST,
      u2: VOTE_AGAINST
    })
    should(result).equal(VOTE_AGAINST)
  })
})

describe('5 members - RULE_PERCENTAGE - 25% (adjusted to 40%)', function () {
  const state = buildState(5, RULE_PERCENTAGE, 0.4)
  it('1VF returns undecided', () => {
    const result = rules[RULE_PERCENTAGE](state, 'generic', {
      u1: VOTE_FOR
    })
    should(result).equal(VOTE_UNDECIDED)
  })

  it('2VF returns for', () => {
    const result = rules[RULE_PERCENTAGE](state, 'generic', {
      u1: VOTE_FOR,
      u2: VOTE_FOR
    })
    should(result).equal(VOTE_FOR)
  })

  it('3VA returns undecided', () => {
    const result = rules[RULE_PERCENTAGE](state, 'generic', {
      u1: VOTE_AGAINST,
      u2: VOTE_AGAINST,
      u3: VOTE_AGAINST
    })
    should(result).equal(VOTE_UNDECIDED)
  })

  it('4VA returns against', () => {
    const result = rules[RULE_PERCENTAGE](state, 'generic', {
      u1: VOTE_AGAINST,
      u2: VOTE_AGAINST,
      u3: VOTE_AGAINST,
      u4: VOTE_AGAINST
    })
    should(result).equal(VOTE_AGAINST)
  })
})

describe('5 members - RULE_DISAGREEMENT - 1', function () {
  const state = buildState(5, RULE_DISAGREEMENT, 1)

  it('4VF returns undecided', () => {
    const result = rules[RULE_DISAGREEMENT](state, 'generic', {
      u1: VOTE_FOR,
      u2: VOTE_FOR,
      u3: VOTE_FOR,
      u4: VOTE_FOR
    })
    should(result).equal(VOTE_UNDECIDED)
  })

  it('4VA returns for', () => {
    const result = rules[RULE_DISAGREEMENT](state, 'generic', {
      u1: VOTE_FOR,
      u2: VOTE_FOR,
      u3: VOTE_FOR,
      u4: VOTE_FOR,
      u5: VOTE_FOR
    })
    should(result).equal(VOTE_FOR)
  })

  it('1VA returns against', () => {
    const result = rules[RULE_DISAGREEMENT](state, 'generic', {
      u1: VOTE_AGAINST
    })
    should(result).equal(VOTE_AGAINST)
  })
})

describe('5 members - RULE_DISAGREEMENT - 4', function () {
  const state = buildState(5, RULE_DISAGREEMENT, 4)

  it('1VF vs 1VA returns for', () => {
    const result = rules[RULE_DISAGREEMENT](state, 'generic', {
      u1: VOTE_FOR,
      u2: VOTE_AGAINST
    })
    should(result).equal(VOTE_UNDECIDED)
  })

  it('2VF returns for', () => {
    const result = rules[RULE_DISAGREEMENT](state, 'generic', {
      u1: VOTE_FOR,
      u2: VOTE_FOR
    })
    should(result).equal(VOTE_FOR)
  })

  it('3VA returns undecided', () => {
    const result = rules[RULE_DISAGREEMENT](state, 'generic', {
      u1: VOTE_AGAINST,
      u2: VOTE_AGAINST,
      u3: VOTE_AGAINST
    })
    should(result).equal(VOTE_UNDECIDED)
  })

  it('4VA returns against', () => {
    const result = rules[RULE_DISAGREEMENT](state, 'generic', {
      u1: VOTE_AGAINST,
      u2: VOTE_AGAINST,
      u3: VOTE_AGAINST,
      u4: VOTE_AGAINST
    })
    should(result).equal(VOTE_AGAINST)
  })

  it('2VF vs 3VA returns for', () => {
    const result = rules[RULE_DISAGREEMENT](state, 'generic', {
      u1: VOTE_FOR,
      u2: VOTE_FOR,
      u3: VOTE_AGAINST,
      u4: VOTE_AGAINST,
      u5: VOTE_AGAINST
    })
    should(result).equal(VOTE_FOR)
  })
})

describe('4 members - RULE_DISAGREEMENT - 10 (adjusted to 3)', function () {
  const state = buildState(4, RULE_DISAGREEMENT, 10)

  it('3VA returns against', () => {
    const result = rules[RULE_DISAGREEMENT](state, 'generic', {
      u1: VOTE_AGAINST,
      u2: VOTE_AGAINST,
      u3: VOTE_AGAINST
    })
    should(result).equal(VOTE_AGAINST)
  })

  it('2VF returns for', () => {
    const result = rules[RULE_DISAGREEMENT](state, 'generic', {
      u1: VOTE_FOR,
      u2: VOTE_FOR
    })
    should(result).equal(VOTE_FOR)
  })

  it('1VF vs 1VA returns undecided', () => {
    const result = rules[RULE_DISAGREEMENT](state, 'generic', {
      u1: VOTE_FOR,
      u2: VOTE_AGAINST
    })
    should(result).equal(VOTE_UNDECIDED)
  })
})

describe('inactive members - RULE_PERCENTAGE - 60%', function () {
  it('6 members - 3VF returns undecided', () => {
    const state = buildState(6, RULE_PERCENTAGE, 0.6)
    const result = rules[RULE_PERCENTAGE](state, 'generic', {
      u1: VOTE_FOR,
      u2: VOTE_FOR,
      u3: VOTE_FOR
    })
    should(result).equal(VOTE_UNDECIDED)
  })

  it('6 members (1 inactive) - 3VF returns for', () => {
    const state = buildState(6, RULE_PERCENTAGE, 0.6, { membersInactive: 1 })
    const result = rules[RULE_PERCENTAGE](state, 'generic', {
      u1: VOTE_FOR,
      u2: VOTE_FOR,
      u3: VOTE_FOR
    })
    should(result).equal(VOTE_FOR)
  })
})

describe('3 members - RULE_DISAGREEMENT - 1 - (remove member)', function () {
  const state = buildState(3, RULE_DISAGREEMENT, 1, { proposalType: PROPOSAL_REMOVE_MEMBER })
  it('1VA returns undecided', () => {
    const result = rules[RULE_DISAGREEMENT](state, PROPOSAL_REMOVE_MEMBER, {
      u1: VOTE_AGAINST
    })
    should(result).equal(VOTE_UNDECIDED)
  })

  it('2VA returns against', () => {
    const result = rules[RULE_DISAGREEMENT](state, PROPOSAL_REMOVE_MEMBER, {
      u1: VOTE_AGAINST,
      u2: VOTE_AGAINST
    })
    should(result).equal(VOTE_AGAINST)
  })

  it('2VF returns for', () => {
    const result = rules[RULE_DISAGREEMENT](state, PROPOSAL_REMOVE_MEMBER, {
      u1: VOTE_FOR,
      u2: VOTE_FOR
    })
    should(result).equal(VOTE_FOR)
  })
})
