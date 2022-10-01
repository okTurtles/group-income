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
      i18n.c-link See proposal
</template>

<script>
import { mapState, mapGetters } from 'vuex'
import { L } from '@common/common.js'
import {
  PROPOSAL_GROUP_SETTING_CHANGE,
  PROPOSAL_INVITE_MEMBER,
  PROPOSAL_REMOVE_MEMBER,
  PROPOSAL_PROPOSAL_SETTING_CHANGE,
  PROPOSAL_VARIANTS
} from '@model/contracts/shared/constants.js'
import MessageBase from './MessageBase.vue'
import SvgHorn from '@svgs/horn.svg'
import SvgYellowHorn from '@svgs/yellow-horn.svg'
import { humanDate } from '@model/contracts/shared/time.js'

const interactiveMessage = (proposal, initialOptions = {}) => {
  const options = Object.assign({}, initialOptions)
  return {
    [PROPOSAL_INVITE_MEMBER]: {
      [PROPOSAL_VARIANTS.CREATED]: L('{from} wants to add new members to the group.', options),
      [PROPOSAL_VARIANTS.EXPIRING]: L('{from} wants to add new members to the group.', options),
      [PROPOSAL_VARIANTS.ACCEPTED]: L('Added members to this group: {to}', options),
      [PROPOSAL_VARIANTS.REJECTED]: L('No members were added.'),
      [PROPOSAL_VARIANTS.EXPIRED]: L('No members were added.')
    },
    [PROPOSAL_REMOVE_MEMBER]: {
      [PROPOSAL_VARIANTS.CREATED]: L('{from} wants to remove members from the group.', options),
      [PROPOSAL_VARIANTS.EXPIRING]: L('{from} wants to remove members from the group.', options),
      [PROPOSAL_VARIANTS.ACCEPTED]: L('Left {title}', options),
      [PROPOSAL_VARIANTS.REJECTED]: L('No members were removed.'),
      [PROPOSAL_VARIANTS.EXPIRED]: L('No members were removed.')
    },
    [PROPOSAL_GROUP_SETTING_CHANGE]: {
      mincomeAmount: {
        [PROPOSAL_VARIANTS.CREATED]: L('{from} wants to change the change the groups mincome. ', options),
        [PROPOSAL_VARIANTS.EXPIRING]: L('{from} wants to change the change the groups mincome. ', options),
        [PROPOSAL_VARIANTS.ACCEPTED]: L('The groups mincome changed.'),
        [PROPOSAL_VARIANTS.REJECTED]: L('The group mincome hasn\'t changed.'),
        [PROPOSAL_VARIANTS.EXPIRED]: L('The group mincome hasn\'t changed.')
      }
    },
    [PROPOSAL_PROPOSAL_SETTING_CHANGE]: {
      votingRule: {
        [PROPOSAL_VARIANTS.CREATED]: L('{from} wants to change the groups voting rules. ', options),
        [PROPOSAL_VARIANTS.EXPIRING]: L('{from} wants to change the groups voting rules. ', options),
        [PROPOSAL_VARIANTS.ACCEPTED]: L('The groups voting rules changed'),
        [PROPOSAL_VARIANTS.REJECTED]: L('The groups voting rules hasn\'t changed.'),
        [PROPOSAL_VARIANTS.EXPIRED]: L('The groups voting rules hasn\'t changed.')
      },
      votingSystem: {
        [PROPOSAL_VARIANTS.CREATED]: L('{from} wants to change the groups voting system. ', options),
        [PROPOSAL_VARIANTS.EXPIRING]: L('{from} wants to change the groups voting system. ', options),
        [PROPOSAL_VARIANTS.ACCEPTED]: L('The groups voting system changed.'),
        [PROPOSAL_VARIANTS.REJECTED]: L('The groups voting system hasn\'t changed.'),
        [PROPOSAL_VARIANTS.EXPIRED]: L('The groups voting system hasn\'t changed.')
      }
    }
  }[proposal.proposalType][proposal.variant]
}

const proposalStatus = (proposal) => {
  const options = {}
  if (proposal.variant === PROPOSAL_VARIANTS.EXPIRING) {
    const dateParts = new Date(proposal.expires_date_ms).toDateString().split(' ')
    dateParts.shift()
    dateParts[1] = dateParts[1] + ','
    options['date'] = dateParts.join(' ')
  }
  return {
    [PROPOSAL_VARIANTS.CREATED]: L('New proposal'),
    [PROPOSAL_VARIANTS.EXPIRING]: L('Proposal expiring on {date}', options),
    [PROPOSAL_VARIANTS.ACCEPTED]: L('Proposal Accepted'),
    [PROPOSAL_VARIANTS.REJECTED]: L('Proposal rejected'),
    [PROPOSAL_VARIANTS.EXPIRED]: L('Proposal expired')
  }[proposal.variant]
}

const proposalSeverity = {
  [PROPOSAL_VARIANTS.CREATED]: 'is-info',
  [PROPOSAL_VARIANTS.EXPIRING]: 'is-warning',
  [PROPOSAL_VARIANTS.ACCEPTED]: 'is-success',
  [PROPOSAL_VARIANTS.REJECTED]: 'is-danger',
  [PROPOSAL_VARIANTS.EXPIRED]: 'is-neutral'
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
    ...mapState(['currentGroupId']),
    ...mapGetters(['globalProfile']),
    interactiveMessage () {
      const { variant, creator } = this.proposal
      const creatorProfile = this.globalProfile(creator)
      const initialOptions = {
        from: creatorProfile.displayName || creatorProfile.username
      }

      return {
        text: interactiveMessage(this.proposal, initialOptions),
        proposalStatus: proposalStatus(this.proposal),
        proposalSeverity: proposalSeverity[variant]
      }
    },
    isYellowHorn () {
      return this.proposal.variant === PROPOSAL_VARIANTS.EXPIRING
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
