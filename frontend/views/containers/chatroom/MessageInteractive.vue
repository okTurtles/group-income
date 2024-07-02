<template lang='pug'>
message-base(v-bind='$props' @wrapperAction='action')
  template(#image='')
    .c-icon(
      :class='{"is-warning": isYellowHorn}'
    )
      svg-yellow-horn(v-if='isYellowHorn')
      svg-horn(v-else)
  template(#header='')
    .c-header
      span.c-title.is-title-5(:class='interactiveMessage.proposalSeverity') {{interactiveMessage.proposalStatus}}
      span.has-text-1 {{ humanDate(datetime, { hour: 'numeric', minute: 'numeric' }) }}
  template(#body='')
    .c-text
      | {{interactiveMessage.text}}
      i18n.c-link(@click='$router.push({ path: "/dashboard#proposals" })') See proposal
</template>

<script>
import { mapGetters } from 'vuex'
import { L } from '@common/common.js'
import {
  PROPOSAL_GROUP_SETTING_CHANGE,
  PROPOSAL_INVITE_MEMBER,
  PROPOSAL_REMOVE_MEMBER,
  PROPOSAL_PROPOSAL_SETTING_CHANGE,
  PROPOSAL_GENERIC,
  STATUS_OPEN,
  STATUS_PASSED,
  STATUS_FAILED,
  STATUS_EXPIRING,
  STATUS_EXPIRED,
  STATUS_CANCELLED
} from '@model/contracts/shared/constants.js'
import { getProposalDetails } from '@model/contracts/shared/functions.js'
import MessageBase from './MessageBase.vue'
import SvgHorn from '@svgs/horn.svg'
import SvgYellowHorn from '@svgs/yellow-horn.svg'
import { humanDate } from '@model/contracts/shared/time.js'
import { get } from '@model/contracts/shared/giLodash.js'

const interactiveMessage = (proposal, baseOptions = {}) => {
  const { proposalType, variant } = proposal
  const { options: proposalDetails } = getProposalDetails({ data: proposal })
  const options = Object.assign(proposalDetails, baseOptions)

  const settingChangeMessages = (options) => ({
    [STATUS_OPEN]: L('{from} wants to change the groups {setting}.', options),
    [STATUS_PASSED]: L('Proposal from {from} to change the {setting} is accepted.', options),
    [STATUS_FAILED]: L('Proposal from {from} to change the {setting} is rejected.', options),
    [STATUS_EXPIRED]: L('Proposal from {from} to change the {setting} is expired.', options),
    [STATUS_EXPIRING]: L('Proposal from {from} to change the {setting} is expiring.', options),
    [STATUS_CANCELLED]: L('Proposal from {from} to change the {setting} is cancelled.', options)
  })

  const interactiveMessages = {
    [PROPOSAL_INVITE_MEMBER]: {
      [STATUS_OPEN]: L('{from} wants to add {member} to the group.', options),
      [STATUS_PASSED]: L('Proposal from {from} to add {member} is accepted.', options),
      [STATUS_FAILED]: L('Proposal from {from} to add {member} is rejected.', options),
      [STATUS_EXPIRED]: L('Proposal from {from} to add {member} is expired.', options),
      [STATUS_EXPIRING]: L('Proposal from {from} to add {member} is expiring.', options),
      [STATUS_CANCELLED]: L('Proposal from {from} to add {member} is cancelled.', options)
    },
    [PROPOSAL_REMOVE_MEMBER]: {
      [STATUS_OPEN]: L('{from} wants to remove {member} from the group.', options),
      [STATUS_PASSED]: L('Proposal from {from} to remove {member} is accepted.', options),
      [STATUS_FAILED]: L('Proposal from {from} to add {member} is rejected.', options),
      [STATUS_EXPIRED]: L('Proposal from {from} to add {member} is expired.', options),
      [STATUS_EXPIRING]: L('Proposal from {from} to remove {member} is expiring.', options),
      [STATUS_CANCELLED]: L('Proposal from {from} to remove {member} is cancelled.', options)
    },
    [PROPOSAL_GROUP_SETTING_CHANGE]: {
      mincomeAmount: settingChangeMessages(options),
      distributionDate: settingChangeMessages(options)
    },
    [PROPOSAL_PROPOSAL_SETTING_CHANGE]: {
      votingRule: settingChangeMessages(options),
      votingSystem: settingChangeMessages(options)
    },
    [PROPOSAL_GENERIC]: {
      [STATUS_OPEN]: L('{from} created a proposal. "{title}"', options),
      [STATUS_PASSED]: L('Proposal from {from} is accepted. "{title}"', options),
      [STATUS_FAILED]: L('Proposal from {from} is rejected. "{title}"', options),
      [STATUS_EXPIRED]: L('Proposal from {from} is expired. "{title}"', options),
      [STATUS_EXPIRING]: L('Proposal from {from} is expiring. "{title}"', options),
      [STATUS_CANCELLED]: L('Proposal from {from} is cancelled. "{title}"', options)
    }
  }

  return get(interactiveMessages, [proposalType, options.settingType, variant].filter(key => !!key))
}

const proposalStatus = (proposal) => {
  const options = {}
  if (proposal.variant === STATUS_EXPIRING) {
    options['date'] = humanDate(proposal.expires_date_ms, { month: 'short', day: 'numeric', year: 'numeric' })
  }
  return {
    [STATUS_OPEN]: L('New proposal'),
    [STATUS_PASSED]: L('Proposal Accepted'),
    [STATUS_FAILED]: L('Proposal rejected'),
    [STATUS_EXPIRED]: L('Proposal expired'),
    [STATUS_EXPIRING]: L('Proposal expiring on {date}', options),
    [STATUS_CANCELLED]: L('Proposal cancelled')
  }[proposal.variant]
}

const proposalSeverity = {
  [STATUS_OPEN]: 'is-info',
  [STATUS_PASSED]: 'is-success',
  [STATUS_FAILED]: 'is-danger',
  [STATUS_EXPIRED]: 'is-neutral',
  [STATUS_EXPIRING]: 'is-warning',
  [STATUS_CANCELLED]: 'is-neutral'
}

export default ({
  name: 'MessageInteractive',
  props: {
    id: String,
    datetime: Date,
    proposal: Object
  },
  components: {
    SvgHorn,
    SvgYellowHorn,
    MessageBase
  },
  methods: {
    humanDate,
    action () {
      console.log('TODO')
    }
  },
  computed: {
    ...mapGetters(['userDisplayNameFromID']),
    interactiveMessage () {
      const { variant, creator } = this.proposal
      const baseOptions = { from: this.userDisplayNameFromID(creator) }

      return {
        text: interactiveMessage(this.proposal, baseOptions),
        proposalStatus: proposalStatus(this.proposal),
        proposalSeverity: proposalSeverity[variant]
      }
    },
    isYellowHorn () {
      return this.proposal.variant === STATUS_EXPIRING
    }
  }
}: Object)
</script>

<style lang="scss" scoped>
@import "@assets/style/_variables.scss";

.c-icon {
  display: flex;
  justify-content: center;
  align-items: center;
  width: 2.5rem;
  height: 2.5rem;
  margin-right: 0.5rem;
  border-radius: 50%;
  background: $primary_2;

  &.is-warning {
    background-color: $warning_2;
  }
}

.c-header {
  display: inline-block;

  .c-title {
    font-size: $size_5;
    margin-right: 0.25rem;
    padding: 0 0.25rem;
    font-family: "Poppins";
    text-transform: uppercase;
  }

  .is-neutral {
    background-color: $general_0;
  }

  .is-info {
    background-color: $primary_2;
    color: $primary_0;
  }

  .is-warning {
    background-color: $warning_2;
    color: $warning_0;
  }

  .is-danger {
    background-color: $danger_2;
    color: $danger_0;
  }

  .is-success {
    background-color: $success_2;
    color: $success_0;
  }
}

.c-link {
  margin-left: 0.25rem;
  border-bottom: 1px solid $text_1;
  cursor: pointer;
  text-decoration: none;
  font-style: italic;
}
</style>
