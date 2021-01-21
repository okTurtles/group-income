'use strict'

import sbp from '~/shared/sbp.js'
import { objectOf, literalOf, unionOf, number } from '~/frontend/utils/flowTyper.js'
import { DAYS_MILLIS } from '~/frontend/utils/time.js'
import { PROPOSAL_RESULT } from '~/frontend/utils/events.js'
import rules, { ruleType, VOTE_UNDECIDED, VOTE_AGAINST, VOTE_FOR, RULE_PERCENTAGE, RULE_DISAGREEMENT } from './rules.js'

import {
  PROPOSAL_INVITE_MEMBER,
  PROPOSAL_REMOVE_MEMBER,
  PROPOSAL_GROUP_SETTING_CHANGE,
  PROPOSAL_PROPOSAL_SETTING_CHANGE,
  PROPOSAL_GENERIC,
  // STATUS_OPEN,
  STATUS_PASSED,
  STATUS_FAILED
  // STATUS_EXPIRED,
  // STATUS_CANCELLED
} from './constants.js'

export function archiveProposal (state: Object, proposalHash: string): void {
  // TODO: handle this better (archive the proposal or whatever)
  console.warn('archiveProposal is not fully implemented yet...')
  // Vue.delete(state.proposals, proposalHash)
}

export function buildInvitationUrl (groupId: string, inviteSecret: string): string {
  return `${location.origin}/app/join?groupId=${groupId}&secret=${inviteSecret}`
}

export const proposalSettingsType: any = objectOf({
  rule: ruleType,
  expires_ms: number,
  ruleSettings: objectOf({
    [RULE_PERCENTAGE]: objectOf({ threshold: number }),
    [RULE_DISAGREEMENT]: objectOf({ threshold: number })
  })
})

// returns true IF a single YES vote is required to pass the proposal
export function oneVoteToPass (proposalHash: string): boolean {
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

function voteAgainst (state: any, { meta, data, contractID }: any) {
  const { proposalHash } = data
  const proposal = state.proposals[proposalHash]
  proposal.status = STATUS_FAILED
  archiveProposal(state, proposalHash)
  sbp('okTurtles.events/emit', PROPOSAL_RESULT, state, VOTE_AGAINST, data)
}

// NOTE: The code is ready to receive different proposals settings,
// However, we decided to make all settings the same, to simplify the UI/UX proptotype.
export const proposalDefaults = {
  rule: RULE_PERCENTAGE,
  expires_ms: 14 * DAYS_MILLIS,
  ruleSettings: ({
    [RULE_PERCENTAGE]: { threshold: 0.75 },
    [RULE_DISAGREEMENT]: { threshold: 1 }
  }: {|disagreement: {|threshold: number|}, percentage: {|threshold: number|}|})
}

const proposals: Object = {
  [PROPOSAL_INVITE_MEMBER]: {
    defaults: proposalDefaults,
    [VOTE_FOR]: function (state, { meta, data, contractID }) {
      const proposal = state.proposals[data.proposalHash]
      proposal.payload = data.passPayload
      proposal.status = STATUS_PASSED
      // NOTE: if invite/process requires more than just data+meta
      //       this code will need to be updated...
      const message = { meta, data: data.passPayload, contractID }
      sbp('gi.contracts/group/invite/process', message, state)
      sbp('okTurtles.events/emit', PROPOSAL_RESULT, state, VOTE_FOR, data)
      // TODO: for now, generate the link and send it to the user's inbox
      //       however, we cannot send GIMessages in any way from here
      //       because that means each time someone synchronizes this contract
      //       a new invite would be sent...
      //       which means the voter who casts the deciding ballot needs to
      //       include in this message the authorization for the new user to
      //       join the group.
      //       we could make it so that all users generate the same authorization
      //       somehow...
      //       however if it's an OP_KEY_* message ther can only be one of those!
      //
      //       so, the deciding voter is the one that generates the passPayload data for the
      //       link includes the OP_KEY_* message in their final vote authorizing
      //       the user.
      //       additionally, for our testing purposes, we check to see if the
      //       currently logged in user is the deciding voter, and if so we
      //       send a message to that user's inbox with the link. The user
      //       clicks the link and then generates an invite accept or invite decline message.
      //
      //       we no longer have a state.invitees, instead we have a state.invites
      // sbp('okTurtles.events/emit', PROPOSAL_RESULT, state, VOTE_FOR, data)
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
    defaults: proposalDefaults,
    [VOTE_FOR]: function (state, { meta, data, contractID }) {
      const { proposalHash, passPayload } = data
      const proposal = state.proposals[proposalHash]
      proposal.status = STATUS_PASSED
      proposal.payload = passPayload
      const messageData = {
        ...proposal.data.proposalData,
        proposalHash,
        proposalPayload: passPayload
      }
      const message = { data: messageData, meta, contractID }
      sbp('gi.contracts/group/removeMember/process', message, state)
      sbp('gi.contracts/group/pushSideEffect', contractID,
        ['gi.contracts/group/removeMember/process/sideEffect', message]
      )
    },
    [VOTE_AGAINST]: voteAgainst
  },
  [PROPOSAL_GROUP_SETTING_CHANGE]: {
    defaults: proposalDefaults,
    [VOTE_FOR]: function (state, { meta, data, contractID }) {
      const proposal = state.proposals[data.proposalHash]
      proposal.status = STATUS_PASSED
      const { setting, proposedValue } = proposal.data.proposalData
      // NOTE: if updateSettings ever needs more ethana just meta+data
      //       this code will need to be updated
      const message = {
        meta,
        data: { [setting]: proposedValue },
        contractID
      }
      sbp('gi.contracts/group/updateSettings/process', message, state)
    },
    [VOTE_AGAINST]: voteAgainst
  },
  [PROPOSAL_PROPOSAL_SETTING_CHANGE]: {
    defaults: proposalDefaults,
    [VOTE_FOR]: function (state, { meta, data, contractID }) {
      const proposal = state.proposals[data.proposalHash]
      proposal.status = STATUS_PASSED
      const message = {
        meta,
        data: proposal.data.proposalData,
        contractID
      }
      sbp('gi.contracts/group/updateAllVotingRules/process', message, state)
    },
    [VOTE_AGAINST]: voteAgainst
  },
  [PROPOSAL_GENERIC]: {
    defaults: proposalDefaults,
    [VOTE_FOR]: function (state, { meta, data }) {
      throw new Error('unimplemented!')
    },
    [VOTE_AGAINST]: voteAgainst
  }
}

export default proposals

export const proposalType: any = unionOf(...Object.keys(proposals).map(k => literalOf(k)))
