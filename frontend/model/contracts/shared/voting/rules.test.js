/* eslint-env mocha */
import rules, { RULE_PERCENTAGE, RULE_DISAGREEMENT, VOTE_FOR, VOTE_AGAINST, VOTE_UNDECIDED } from './rules.js'
import { PROPOSAL_REMOVE_MEMBER } from '~/frontend/model/contracts/voting/constants.js'
const should = require('should')

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

describe('RULE_PERCENTAGE - 70% - 5 members', function () {
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

describe('RULE_PERCENTAGE - 25% - 5 members - (adjusted to 40%)', function () {
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

describe('RULE_DISAGREEMENT - 1 - 5 members', function () {
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

describe('RULE_DISAGREEMENT - 4 - 5 members', function () {
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

describe('RULE_DISAGREEMENT - 10 - 4 members - (10 adjusted to 3)', function () {
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

describe('RULE_PERCENTAGE - 60% - inactive members', function () {
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

describe('RULE_DISAGREEMENT - 1 - 3 members - propose to remove member', function () {
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

describe('RULE_PERCENTAGE - 80% - 3 members - propose to remove member', function () {
  const state = buildState(3, RULE_PERCENTAGE, 0.8, { proposalType: PROPOSAL_REMOVE_MEMBER })
  it('1VA returns undecided', () => {
    const result = rules[RULE_PERCENTAGE](state, PROPOSAL_REMOVE_MEMBER, {
      u1: VOTE_AGAINST
    })
    should(result).equal(VOTE_AGAINST)
  })

  it('2VA returns against', () => {
    const result = rules[RULE_PERCENTAGE](state, PROPOSAL_REMOVE_MEMBER, {
      u1: VOTE_AGAINST,
      u2: VOTE_AGAINST
    })
    should(result).equal(VOTE_AGAINST)
  })

  it('2VF returns for', () => {
    const result = rules[RULE_PERCENTAGE](state, PROPOSAL_REMOVE_MEMBER, {
      u1: VOTE_FOR,
      u2: VOTE_FOR
    })
    should(result).equal(VOTE_FOR)
  })
})
