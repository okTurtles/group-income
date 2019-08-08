'use strict'

import { literalOf, unionOf } from '~/frontend/utils/flowTyper.js'

export const PROPOSAL_INVITE = 'invite'
export const PROPOSAL_REMOVE_MEMBER = 'remove-member'
export const PROPOSAL_PROP_CHANGE = 'prop-change'

export const proposalType = unionOf(literalOf(PROPOSAL_INVITE), literalOf(PROPOSAL_REMOVE_MEMBER), literalOf(PROPOSAL_PROP_CHANGE))
