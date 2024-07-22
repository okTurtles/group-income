'use strict'

import sbp from '@sbp/sbp'
import { Vue } from '@common/common.js'
import { objectOf, literalOf, unionOf, number } from '~/frontend/model/contracts/misc/flowTyper.js'
import { DAYS_MILLIS } from '../time.js'
import rules, { ruleType, VOTE_AGAINST, VOTE_FOR, RULE_PERCENTAGE, RULE_DISAGREEMENT } from './rules.js'
import {
  PROPOSAL_RESULT,
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
} from '../constants.js'

export function notifyAndArchiveProposal ({ state, proposalHash, proposal, contractID, meta, height }: {
  state: Object,
  proposalHash: string,
  proposal: any,
  contractID: string,
  meta: Object,
  height: number
}) {
  Vue.delete(state.proposals, proposalHash)

  // NOTE: we can not make notification for the proposal closal
  //       in the /proposalVote/sideEffect
  //       because we remove the state.proposals[proposalHash] in the process function
  //       and can not access the proposal data in the sideEffect
  sbp('gi.contracts/group/pushSideEffect', contractID,
    ['gi.contracts/group/makeNotificationWhenProposalClosed', state, contractID, meta, height, proposal]
  )
  sbp('gi.contracts/group/pushSideEffect', contractID,
    ['gi.contracts/group/archiveProposal', contractID, proposalHash, proposal]
  )
}

export function buildInvitationUrl (groupId: string, groupName: string, inviteSecret: string, creatorID?: string): string {
  const rootGetters = sbp('state/vuex/getters')
  const creatorUsername = creatorID && rootGetters.usernameFromID(creatorID)
  return `${location.origin}/app/join?${(new URLSearchParams({
      groupId: groupId,
      groupName: groupName,
      secret: inviteSecret,
      ...(creatorID && {
        creatorID,
        ...(creatorUsername && {
          creatorUsername
        })
      })
    })).toString()}`
}

export const proposalSettingsType: any = objectOf({
  rule: ruleType,
  expires_ms: number,
  ruleSettings: objectOf({
    [RULE_PERCENTAGE]: objectOf({ threshold: number }),
    [RULE_DISAGREEMENT]: objectOf({ threshold: number })
  })
})

export function oneVoteToCloseWith (state: Object, proposalHash: string, expectedResult: string): boolean {
  const proposal = state.proposals[proposalHash]
  const votes = Object.assign({}, proposal.votes)
  const currentResult = rules[proposal.data.votingRule](state, proposal.data.proposalType, votes)
  votes[String(Math.random())] = expectedResult
  const newResult = rules[proposal.data.votingRule](state, proposal.data.proposalType, votes)
  console.debug(`oneVoteToCloseWith currentResult(${currentResult}) newResult(${newResult})`)

  // If a member was removed, currentResult could also be `expectedResult`
  // TODO: Re-process active proposals to handle this case
  // return currentResult === VOTE_UNDECIDED && newResult === `expectedResult`
  return newResult === expectedResult
}

// returns true IF a single YES vote is required to pass the proposal
export function oneVoteToPass (state: Object, proposalHash: string): boolean {
  return oneVoteToCloseWith(state, proposalHash, VOTE_FOR)
}

// returns true IF a single YES vote is required to pass the proposal
export function oneVoteToFail (state: Object, proposalHash: string): boolean {
  return oneVoteToCloseWith(state, proposalHash, VOTE_AGAINST)
}

function voteAgainst (state: any, { meta, data, contractID, height }: any) {
  const { proposalHash } = data
  const proposal = state.proposals[proposalHash]
  proposal.status = STATUS_FAILED
  sbp('okTurtles.events/emit', PROPOSAL_RESULT, state, VOTE_AGAINST, data)
  notifyAndArchiveProposal({ state, proposalHash, proposal, contractID, meta, height })
}

// NOTE: The code is ready to receive different proposals settings,
// However, we decided to make all settings the same, to simplify the UI/UX proptotype.
export const proposalDefaults = {
  rule: RULE_PERCENTAGE,
  expires_ms: 14 * DAYS_MILLIS,
  ruleSettings: ({
    [RULE_PERCENTAGE]: { threshold: 0.66 },
    [RULE_DISAGREEMENT]: { threshold: 1 }
  }: {|disagreement: {|threshold: number|}, percentage: {|threshold: number|}|})
}

const proposals: Object = {
  [PROPOSAL_INVITE_MEMBER]: {
    defaults: proposalDefaults,
    [VOTE_FOR]: async function (state, message) {
      const { data, contractID, meta, height } = message
      const { proposalHash } = data
      const proposal = state.proposals[proposalHash]
      proposal.payload = data.passPayload
      proposal.status = STATUS_PASSED
      // NOTE: if invite/process requires more than just data+meta
      //       this code will need to be updated...
      const forMessage = { ...message, data: data.passPayload }
      await sbp('gi.contracts/group/invite/process', forMessage, state)
      sbp('okTurtles.events/emit', PROPOSAL_RESULT, state, VOTE_FOR, data)
      notifyAndArchiveProposal({ state, proposalHash, proposal, contractID, meta, height })
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
    [VOTE_FOR]: async function (state, message) {
      const { data, contractID, meta, height } = message
      const { proposalHash, passPayload } = data
      const proposal = state.proposals[proposalHash]
      proposal.status = STATUS_PASSED
      proposal.payload = passPayload
      const messageData = proposal.data.proposalData
      const forMessage = { ...message, data: messageData, proposalHash }
      await sbp('gi.contracts/group/removeMember/process', forMessage, state)
      sbp('gi.contracts/group/pushSideEffect', contractID,
        ['gi.contracts/group/removeMember/sideEffect', forMessage]
      )
      notifyAndArchiveProposal({ state, proposalHash, proposal, contractID, meta, height })
    },
    [VOTE_AGAINST]: voteAgainst
  },
  [PROPOSAL_GROUP_SETTING_CHANGE]: {
    defaults: proposalDefaults,
    [VOTE_FOR]: async function (state, message) {
      const { data, contractID, meta, height } = message
      const { proposalHash } = data
      const proposal = state.proposals[proposalHash]
      proposal.status = STATUS_PASSED
      const { setting, proposedValue } = proposal.data.proposalData
      // NOTE: if updateSettings ever needs more ethana just meta+data
      //       this code will need to be updated
      const forMessage = {
        ...message,
        data: { [setting]: proposedValue },
        proposalHash
      }
      await sbp('gi.contracts/group/updateSettings/process', forMessage, state)
      sbp('gi.contracts/group/pushSideEffect', contractID,
        ['gi.contracts/group/updateSettings/sideEffect', forMessage])
      notifyAndArchiveProposal({ state, proposalHash, proposal, contractID, meta, height })
    },
    [VOTE_AGAINST]: voteAgainst
  },
  [PROPOSAL_PROPOSAL_SETTING_CHANGE]: {
    defaults: proposalDefaults,
    [VOTE_FOR]: async function (state, message) {
      const { data, contractID, meta, height } = message
      const { proposalHash } = data
      const proposal = state.proposals[proposalHash]
      proposal.status = STATUS_PASSED
      const forMessage = {
        ...message,
        data: proposal.data.proposalData,
        proposalHash
      }
      await sbp('gi.contracts/group/updateAllVotingRules/process', forMessage, state)
      notifyAndArchiveProposal({ state, proposalHash, proposal, contractID, meta, height })
    },
    [VOTE_AGAINST]: voteAgainst
  },
  [PROPOSAL_GENERIC]: {
    defaults: proposalDefaults,
    [VOTE_FOR]: function (state, { data, contractID, meta, height }) {
      const { proposalHash } = data
      const proposal = state.proposals[proposalHash]
      proposal.status = STATUS_PASSED
      sbp('okTurtles.events/emit', PROPOSAL_RESULT, state, VOTE_FOR, data)
      notifyAndArchiveProposal({ state, proposalHash, proposal, contractID, meta, height })
    },
    [VOTE_AGAINST]: voteAgainst
  }
}

export default proposals

export const proposalType: any = unionOf(...Object.keys(proposals).map(k => literalOf(k)))
