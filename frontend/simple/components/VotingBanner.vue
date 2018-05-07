<template>
  <div class="notification columns is-multiline is-centered is-warning has-text-centered">
    <p class="column is-12">
      <strong data-test="initiator">{{ initiator }}</strong>
      <i18n>proposed to</i18n>
      <strong data-test="proposal">{{ proposalText }}</strong>
    </p>

    <div class="column is-3">
      <button class="button is-success is-fullwidth">
        <i18n>For</i18n>
      </button>
    </div>

    <div class="column is-3">
      <button class="button is-danger is-fullwidth">
        <i18n>Against</i18n>
      </button>
    </div>

    <p class="column is-12 is-size-7 is-italic gi-is-opacity-1">
      {{votesCount}} <i18n>votes received</i18n>
    </p>
	</div>
</template>
<script>
import L from '../js/translations'
import template from 'string-template'
import { HashableGroupProposal } from '../../../shared/events'

export default {
  name: 'VotingBanner',
  props: {
    proposal: Object
  },
  data () {
    return {
      initiator: this.proposal.initiator,
      votesCount: this.proposal.for.length + this.proposal.against.length
    }
  },
  computed: {
    proposalText: function () {
      switch (this.proposal.type) {
        case HashableGroupProposal.TypeInvitation: return template(L('invite {candidate} to the group.'),
          {
            candidate: this.proposal.candidate
          })
        case HashableGroupProposal.TypeRemoval: return template(L('remove {member} from the group.'),
          {
            member: this.proposal.candidate
          })
        case HashableGroupProposal.TypeChange: return template(L('change {property} to {value}.'),
          {
            property: this.proposal.property,
            value: this.proposal.value
          })
      }
    }
  }
}
</script>
