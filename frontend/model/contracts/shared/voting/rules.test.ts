// Can run directly with:
// deno test --import-map=import-map-for-tests.json frontend/model/contracts/shared/voting/rules.test.ts

import { assertEquals } from 'asserts'

import rules, { RULE_PERCENTAGE, RULE_DISAGREEMENT, VOTE_FOR, VOTE_AGAINST, VOTE_UNDECIDED } from '@contracts/shared/voting/rules.js'
import { PROPOSAL_REMOVE_MEMBER } from '@contracts/shared/constants.js'

type Options = {
  membersInactive?: number
  proposalType?: string
}

type Profile = {
  status: string
}

type ProfileMap = {
  [key: string]: Profile
}

const buildState = (groupSize: number, rule: string, threshold: number, opts: Options = {}) => {
  const { proposalType, membersInactive } = {
    proposalType: opts.proposalType || 'generic',
    membersInactive: opts.membersInactive || 0
  }
  return {
    profiles: (() => {
      const profiles: ProfileMap = {}
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

Deno.test('RULE_PERCENTAGE - 70% - 5 members', async function (tests) {
  const state = buildState(5, RULE_PERCENTAGE, 0.70)

  await tests.step('3VF returns undecided', () => {
    const result = rules[RULE_PERCENTAGE](state, 'generic', {
      u1: VOTE_FOR,
      u2: VOTE_FOR,
      u3: VOTE_FOR
    })
    assertEquals(result, VOTE_UNDECIDED)
  })

  await tests.step('4VF returns for', () => {
    const result = rules[RULE_PERCENTAGE](state, 'generic', {
      u1: VOTE_FOR,
      u2: VOTE_FOR,
      u3: VOTE_FOR,
      u4: VOTE_FOR
    })
    assertEquals(result, VOTE_FOR)
  })

  await tests.step('2VA returns against', () => {
    const result = rules[RULE_PERCENTAGE](state, 'generic', {
      u1: VOTE_AGAINST,
      u2: VOTE_AGAINST
    })
    assertEquals(result, VOTE_AGAINST)
  })
})

Deno.test('RULE_PERCENTAGE - 25% - 5 members - (adjusted to 40%)', async function (tests) {
  const state = buildState(5, RULE_PERCENTAGE, 0.4)

  await tests.step('1VF returns undecided', () => {
    const result = rules[RULE_PERCENTAGE](state, 'generic', {
      u1: VOTE_FOR
    })
    assertEquals(result, VOTE_UNDECIDED)
  })

  await tests.step('2VF returns for', () => {
    const result = rules[RULE_PERCENTAGE](state, 'generic', {
      u1: VOTE_FOR,
      u2: VOTE_FOR
    })
    assertEquals(result, VOTE_FOR)
  })

  await tests.step('3VA returns undecided', () => {
    const result = rules[RULE_PERCENTAGE](state, 'generic', {
      u1: VOTE_AGAINST,
      u2: VOTE_AGAINST,
      u3: VOTE_AGAINST
    })
    assertEquals(result, VOTE_UNDECIDED)
  })

  await tests.step('4VA returns against', () => {
    const result = rules[RULE_PERCENTAGE](state, 'generic', {
      u1: VOTE_AGAINST,
      u2: VOTE_AGAINST,
      u3: VOTE_AGAINST,
      u4: VOTE_AGAINST
    })
    assertEquals(result, VOTE_AGAINST)
  })
})

Deno.test('RULE_DISAGREEMENT - 1 - 5 members', async function (tests) {
  const state = buildState(5, RULE_DISAGREEMENT, 1)

  await tests.step('4VF returns undecided', () => {
    const result = rules[RULE_DISAGREEMENT](state, 'generic', {
      u1: VOTE_FOR,
      u2: VOTE_FOR,
      u3: VOTE_FOR,
      u4: VOTE_FOR
    })
    assertEquals(result, VOTE_UNDECIDED)
  })

  await tests.step('4VA returns for', () => {
    const result = rules[RULE_DISAGREEMENT](state, 'generic', {
      u1: VOTE_FOR,
      u2: VOTE_FOR,
      u3: VOTE_FOR,
      u4: VOTE_FOR,
      u5: VOTE_FOR
    })
    assertEquals(result, VOTE_FOR)
  })

  await tests.step('1VA returns against', () => {
    const result = rules[RULE_DISAGREEMENT](state, 'generic', {
      u1: VOTE_AGAINST
    })
    assertEquals(result, VOTE_AGAINST)
  })
})

Deno.test('RULE_DISAGREEMENT - 4 - 5 members', async function (tests) {
  const state = buildState(5, RULE_DISAGREEMENT, 4)

  await tests.step('1VF vs 1VA returns for', () => {
    const result = rules[RULE_DISAGREEMENT](state, 'generic', {
      u1: VOTE_FOR,
      u2: VOTE_AGAINST
    })
    assertEquals(result, VOTE_UNDECIDED)
  })

  await tests.step('2VF returns for', () => {
    const result = rules[RULE_DISAGREEMENT](state, 'generic', {
      u1: VOTE_FOR,
      u2: VOTE_FOR
    })
    assertEquals(result, VOTE_FOR)
  })

  await tests.step('3VA returns undecided', () => {
    const result = rules[RULE_DISAGREEMENT](state, 'generic', {
      u1: VOTE_AGAINST,
      u2: VOTE_AGAINST,
      u3: VOTE_AGAINST
    })
    assertEquals(result, VOTE_UNDECIDED)
  })

  await tests.step('4VA returns against', () => {
    const result = rules[RULE_DISAGREEMENT](state, 'generic', {
      u1: VOTE_AGAINST,
      u2: VOTE_AGAINST,
      u3: VOTE_AGAINST,
      u4: VOTE_AGAINST
    })
    assertEquals(result, VOTE_AGAINST)
  })

  await tests.step('2VF vs 3VA returns for', () => {
    const result = rules[RULE_DISAGREEMENT](state, 'generic', {
      u1: VOTE_FOR,
      u2: VOTE_FOR,
      u3: VOTE_AGAINST,
      u4: VOTE_AGAINST,
      u5: VOTE_AGAINST
    })
    assertEquals(result, VOTE_FOR)
  })
})

Deno.test('RULE_DISAGREEMENT - 10 - 4 members - (10 adjusted to 3)', async function (tests) {
  const state = buildState(4, RULE_DISAGREEMENT, 10)

  await tests.step('3VA returns against', () => {
    const result = rules[RULE_DISAGREEMENT](state, 'generic', {
      u1: VOTE_AGAINST,
      u2: VOTE_AGAINST,
      u3: VOTE_AGAINST
    })
    assertEquals(result, VOTE_AGAINST)
  })

  await tests.step('2VF returns for', () => {
    const result = rules[RULE_DISAGREEMENT](state, 'generic', {
      u1: VOTE_FOR,
      u2: VOTE_FOR
    })
    assertEquals(result, VOTE_FOR)
  })

  await tests.step('1VF vs 1VA returns undecided', () => {
    const result = rules[RULE_DISAGREEMENT](state, 'generic', {
      u1: VOTE_FOR,
      u2: VOTE_AGAINST
    })
    assertEquals(result, VOTE_UNDECIDED)
  })
})

Deno.test('RULE_PERCENTAGE - 60% - inactive members', async function (tests) {
  await tests.step('6 members - 3VF returns undecided', () => {
    const state = buildState(6, RULE_PERCENTAGE, 0.6)
    const result = rules[RULE_PERCENTAGE](state, 'generic', {
      u1: VOTE_FOR,
      u2: VOTE_FOR,
      u3: VOTE_FOR
    })
    assertEquals(result, VOTE_UNDECIDED)
  })

  await tests.step('6 members (1 inactive) - 3VF returns for', () => {
    const state = buildState(6, RULE_PERCENTAGE, 0.6, { membersInactive: 1 })
    const result = rules[RULE_PERCENTAGE](state, 'generic', {
      u1: VOTE_FOR,
      u2: VOTE_FOR,
      u3: VOTE_FOR
    })
    assertEquals(result, VOTE_FOR)
  })
})

Deno.test('RULE_DISAGREEMENT - 1 - 3 members - propose to remove member', async function (tests) {
  const state = buildState(3, RULE_DISAGREEMENT, 1, { proposalType: PROPOSAL_REMOVE_MEMBER })

  await tests.step('1VA returns undecided', () => {
    const result = rules[RULE_DISAGREEMENT](state, PROPOSAL_REMOVE_MEMBER, {
      u1: VOTE_AGAINST
    })
    assertEquals(result, VOTE_UNDECIDED)
  })

  await tests.step('2VA returns against', () => {
    const result = rules[RULE_DISAGREEMENT](state, PROPOSAL_REMOVE_MEMBER, {
      u1: VOTE_AGAINST,
      u2: VOTE_AGAINST
    })
    assertEquals(result, VOTE_AGAINST)
  })

  await tests.step('2VF returns for', () => {
    const result = rules[RULE_DISAGREEMENT](state, PROPOSAL_REMOVE_MEMBER, {
      u1: VOTE_FOR,
      u2: VOTE_FOR
    })
    assertEquals(result, VOTE_FOR)
  })
})

Deno.test('RULE_PERCENTAGE - 80% - 3 members - propose to remove member', async function (tests) {
  const state = buildState(3, RULE_PERCENTAGE, 0.8, { proposalType: PROPOSAL_REMOVE_MEMBER })

  await tests.step('1VA returns undecided', () => {
    const result = rules[RULE_PERCENTAGE](state, PROPOSAL_REMOVE_MEMBER, {
      u1: VOTE_AGAINST
    })
    assertEquals(result, VOTE_AGAINST)
  })

  await tests.step('2VA returns against', () => {
    const result = rules[RULE_PERCENTAGE](state, PROPOSAL_REMOVE_MEMBER, {
      u1: VOTE_AGAINST,
      u2: VOTE_AGAINST
    })
    assertEquals(result, VOTE_AGAINST)
  })

  await tests.step('2VF returns for', () => {
    const result = rules[RULE_PERCENTAGE](state, PROPOSAL_REMOVE_MEMBER, {
      u1: VOTE_FOR,
      u2: VOTE_FOR
    })
    assertEquals(result, VOTE_FOR)
  })
})
