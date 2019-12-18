'use strict'

import sbp from '~/shared/sbp.js'
// import Vue from 'vue'
import { objectOf, literalOf, unionOf, number } from '~/frontend/utils/flowTyper.js'
import { DAYS_MILLIS } from '~/frontend/utils/time.js'
import { PROPOSAL_RESULT } from '~/frontend/utils/events.js'
import rules, { ruleType, VOTE_UNDECIDED, VOTE_AGAINST, VOTE_FOR, RULE_THRESHOLD, RULE_DISAGREEMENT } from './rules.js'

export const PROPOSAL_INVITE_MEMBER = 'invite-member'
export const PROPOSAL_REMOVE_MEMBER = 'remove-member'
export const PROPOSAL_GROUP_SETTING_CHANGE = 'group-setting-change'
export const PROPOSAL_PROPOSAL_SETTING_CHANGE = 'proposal-setting-change'
export const PROPOSAL_GENERIC = 'generic'

export const STATUS_OPEN = 'open'
export const STATUS_PASSED = 'passed'
export const STATUS_FAILED = 'failed'
export const STATUS_EXPIRED = 'expired'
export const STATUS_CANCELLED = 'cancelled'

export function archiveProposal (state, proposalHash) {
  // TODO: handle this better (archive the proposal or whatever)
  console.warn('archiveProposal is not fully implemented yet...')
  // Vue.delete(state.proposals, proposalHash)
}

export function buildInvitationUrl (groupId, inviteSecret) {
  return `${process.env.FRONTEND_URL}/app/join?groupId=${groupId}&secret=${inviteSecret}`
}

export const proposalSettingsType = objectOf({
  rule: ruleType,
  expires_ms: number,
  ruleSettings: objectOf({
    [RULE_THRESHOLD]: objectOf({ threshold: number }),
    [RULE_DISAGREEMENT]: objectOf({ threshold: number })
  })
})

// returns true IF a single YES vote is required to pass the proposal
export function oneVoteToPass (proposalHash) {
  const rootState = sbp('state/vuex/state')
  const state = rootState[rootState.currentGroupId]
  const proposal = state.proposals[proposalHash]
  const votes = Object.assign({}, proposal.votes)
  const currentResult = rules[proposal.data.votingRule](state, proposal.data.proposalType, votes)
  votes[String(Math.random())] = VOTE_FOR
  const newResult = rules[proposal.data.votingRule](state, proposal.data.proposalType, votes)
  console.debug(`oneVoteToPass currentResult(${currentResult}) newResult(${newResult})`)
  return currentResult === VOTE_UNDECIDED && newResult === VOTE_FOR
}

function voteAgainst (state, data) {
  const { proposalHash } = data
  const proposal = state.proposals[proposalHash]
  proposal.status = STATUS_FAILED
  archiveProposal(state, proposalHash)
  sbp('okTurtles.events/emit', PROPOSAL_RESULT, state, VOTE_AGAINST, data)
}

const proposals = {
  [PROPOSAL_INVITE_MEMBER]: {
    defaults: {
      rule: RULE_THRESHOLD, // the default voting rule governing invites
      expires_ms: 14 * DAYS_MILLIS,
      ruleSettings: {
        [RULE_THRESHOLD]: { threshold: 0.8 },
        [RULE_DISAGREEMENT]: { threshold: 1 }
      }
    },
    [VOTE_FOR]: function (state, data) {
      const proposal = state.proposals[data.proposalHash]
      proposal.payload = data.passPayload
      proposal.status = STATUS_PASSED
      sbp('gi.contracts/group/invite/process', state, {
        meta: proposal.meta,
        data: data.passPayload
      })
      sbp('okTurtles.events/emit', PROPOSAL_RESULT, state, VOTE_FOR, data)
    },
    [VOTE_AGAINST]: voteAgainst
  },
  [PROPOSAL_REMOVE_MEMBER]: {
    defaults: {
      rule: RULE_THRESHOLD,
      expires_ms: 14 * DAYS_MILLIS,
      ruleSettings: {
        [RULE_THRESHOLD]: { threshold: 0.8 },
        // at least 2, since the member being removed shouldn't be able to
        // block the proposal themselves
        [RULE_DISAGREEMENT]: { threshold: 2 }
      }
    },
    [VOTE_FOR]: function (state, { proposalHash, passPayload }) {
      console.error('unimplemented!')
      // TODO: unsubscribe from their mailbox and identity contract
      //       call commit('removeContract'), etc.
    },
    [VOTE_AGAINST]: voteAgainst
  },
  [PROPOSAL_GROUP_SETTING_CHANGE]: {
    defaults: {
      rule: RULE_THRESHOLD,
      expires_ms: 7 * DAYS_MILLIS,
      ruleSettings: {
        [RULE_THRESHOLD]: { threshold: 0.8 },
        [RULE_DISAGREEMENT]: { threshold: 1 }
      }
    },
    [VOTE_FOR]: function (state, data) {
      const proposal = state.proposals[data.proposalHash]
      proposal.status = STATUS_PASSED
      const { setting, proposedValue } = proposal.data.proposalData

      sbp('gi.contracts/group/updateSettings/process', state, {
        meta: proposal.meta,
        data: { [setting]: proposedValue }
      })
    },
    [VOTE_AGAINST]: voteAgainst
  },
  // used to adjust settings like `rule` and `expires_ms` on proposals themselves
  [PROPOSAL_PROPOSAL_SETTING_CHANGE]: {
    defaults: {
      rule: RULE_THRESHOLD,
      expires_ms: 7 * DAYS_MILLIS,
      ruleSettings: {
        [RULE_THRESHOLD]: { threshold: 0.8 },
        [RULE_DISAGREEMENT]: { threshold: 1 }
      }
    },
    [VOTE_FOR]: function (state, { proposalHash, passPayload }) {
      throw new Error('unimplemented!')
    },
    [VOTE_AGAINST]: voteAgainst
  },
  [PROPOSAL_GENERIC]: {
    defaults: {
      rule: RULE_THRESHOLD,
      expires_ms: 7 * DAYS_MILLIS,
      ruleSettings: {
        [RULE_THRESHOLD]: { threshold: 0.8 },
        [RULE_DISAGREEMENT]: { threshold: 1 }
      }
    },
    [VOTE_FOR]: function (state, { proposalHash, passPayload }) {
      throw new Error('unimplemented!')
    },
    [VOTE_AGAINST]: voteAgainst
  }
}

export default proposals

export const proposalType = unionOf(...Object.keys(proposals).map(k => literalOf(k)))
