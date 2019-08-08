<template lang="pug">
.notification.columns.is-multiline.is-centered.is-warning.has-text-centered
  p.column.is-12
    strong(data-test='initiator') {{ initiator }}
    i18n proposed to
    strong(data-test='proposal') {{ proposalText }}

  .column.is-3
    i18n.is-success.is-fullwidth(tag='button') For

  .column.is-3
    i18n.is-danger.is-fullwidth(tag='button') Against

  p.column.is-12.is-size-7.is-italic
    | {{votesCount}}
    i18n votes received
</template>

<script>
import L from '@view-utils/translations.js'
import * as proposals from '@model/contracts/voting/proposals.js'

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
      let proposal = ''
      switch (this.proposal.type) {
        case proposals.PROPOSAL_INVITE: {
          proposal = L('invite {candidate} to the group.',
            {
              candidate: this.proposal.candidate
            })
          break
        }
        case proposals.PROPOSAL_REMOVE_MEMBER: {
          proposal = L('remove {member} from the group.',
            {
              member: this.proposal.candidate
            })
          break
        }
        case proposals.PROPOSAL_PROP_CHANGE: {
          proposal = L('change {property} to {value}.',
            {
              property: this.proposal.property,
              value: this.proposal.value
            })
          break
        }
      }
      return proposal
    }
  }
}
</script>
