'use strict'

import { literalOf, unionOf } from '~/frontend/utils/flowTyper.js'

export const PROPOSAL_INVITE = 'invite'
export const PROPOSAL_REMOVE_MEMBER = 'remove-member'
export const PROPOSAL_PROP_CHANGE = 'prop-change'
export const PROPOSAL_GENERIC = 'generic'

export const proposalType = unionOf(literalOf(PROPOSAL_INVITE), literalOf(PROPOSAL_REMOVE_MEMBER), literalOf(PROPOSAL_PROP_CHANGE), literalOf(PROPOSAL_GENERIC))

export default {
  [PROPOSAL_INVITE]: {
    expires: '7 days',
    passedAction (state, proposal) {
      // TODO: generate and save invite link, which is used to generate a group/inviteAccept message
      //       the invite link contains the secret to a public/private keypair that is generated
      //       by the final voter, this keypair is a special "write only" keypair that is allowed
      //       to only send a single kind of message to the group (accepting the invite, deleting
      //       the writeonly keypair, and registering a new keypair with the group that has
      //       full member privileges, i.e. their identity contract). The writeonly keypair
      //       that's registered originally also contains attributes that tell the server
      //       what kind of message(s) it's allowed to send to the contract, and how many
      //       of them.
    }
  },
  [PROPOSAL_REMOVE_MEMBER]: {
    expires: '7 days'
  },
  [PROPOSAL_PROP_CHANGE]: {
    expires: '7 days'
  }
}
