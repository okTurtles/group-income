'use strict'

import sbp from '~/shared/sbp.js'
import Vue from 'vue'
import { objectOf, literalOf, unionOf, number } from '~/frontend/utils/flowTyper.js'
import { DAYS_MILLIS } from '~/frontend/utils/time.js'
import { PROPOSAL_RESULT } from '~/frontend/utils/events.js'
import { ruleType, VOTE_AGAINST, VOTE_FOR, RULE_THRESHOLD, RULE_DISAGREEMENT } from './rules.js'

export const PROPOSAL_INVITE_MEMBER = 'invite-member'
export const PROPOSAL_REMOVE_MEMBER = 'remove-member'
export const PROPOSAL_GROUP_SETTING_CHANGE = 'group-setting-change'
export const PROPOSAL_PROPOSAL_SETTING_CHANGE = 'proposal-setting-change'
export const PROPOSAL_GENERIC = 'generic'

export function archiveProposal (state, proposalHash) {
  // TODO: handle this better (archive the proposal or whatever)
  Vue.delete(state.proposals, proposalHash)
}

export const proposalSettingsType = objectOf({
  rule: ruleType,
  expires_ms: number,
  ruleSettings: objectOf({
    [RULE_THRESHOLD]: objectOf({ threshold: number }),
    [RULE_DISAGREEMENT]: objectOf({ threshold: number })
  })
})

function voteAgainst (state, data) {
  const { proposalHash } = data
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
      // const { proposalHash } = data
      // const proposal = state.proposals[proposalHash]
      // TODO: for now, simply add the user to the group, assuming that their "name" is their
      //       username.
      sbp('okTurtles.events/emit', PROPOSAL_RESULT, state, VOTE_FOR, data)
      // TODO: generate and save invite link, which is used to generate a group/inviteAccept message
      //       the invite link contains the secret to a public/private keypair that is generated
      //       by the final voter, this keypair is a special "write only" keypair that is allowed
      //       to only send a single kind of message to the group (accepting the invite, deleting
      //       the writeonly keypair, and registering a new keypair with the group that has
      //       full member privileges, i.e. their identity contract). The writeonly keypair
      //       that's registered originally also contains attributes that tell the server
      //       what kind of message(s) it's allowed to send to the contract, and how many
      //       of them.
    },
    [VOTE_AGAINST]: voteAgainst
  },
  [PROPOSAL_REMOVE_MEMBER]: {
    defaults: {
      rule: RULE_THRESHOLD,
      expires_ms: 14 * DAYS_MILLIS,
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
  [PROPOSAL_GROUP_SETTING_CHANGE]: {
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
