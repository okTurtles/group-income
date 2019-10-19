<template lang='pug'>
li.c-wrapper
  user-image.c-avatar(:username='proposal.meta.username')
  .c-header
    h4.has-text-bold(data-test='title') {{ title }}:
    span {{ humanDate }}
  .c-main
    p.has-text-1(v-if='humanReason') {{ humanReason }}
    ul
      proposal-item(
        v-for='hash in proposalHashes'
        :key='hash'
        :proposalHash='hash'
      )
</template>

<script>
import { mapGetters } from 'vuex'
import L from '@view-utils/translations.js'
import UserImage from '@containers/UserImage.vue'
import ProposalItem from './ProposalItem.vue'
import { STATUS_OPEN } from '@model/contracts/voting/proposals.js'

export default {
  name: 'ProposalBox',
  props: {
    proposalHashes: Array // [hash1, hash2, ...]
  },
  components: {
    ProposalItem,
    UserImage
  },
  computed: {
    ...mapGetters([
      'currentGroupState',
      'ourUserIdentityContract'
    ]),
    proposal () {
      // Pick the 1st hash as guidance/pivot for this group of proposals
      return this.currentGroupState.proposals[this.proposalHashes[0]]
    },
    title () {
      const { identityContractID } = this.proposal.meta
      const username = this.$store.state[identityContractID].attributes.name
      const currentUsername = this.ourUserIdentityContract.attributes.name
      const who = username === currentUsername ? L('You') : username
      const isAnyOpen = this.proposalHashes.some(hash => this.currentGroupState.proposals[hash].status === STATUS_OPEN)

      if (!isAnyOpen) {
        return L('{who} proposed', { who })
      }

      return username === currentUsername
        ? L('You are proposing')
        : L('{who} is proposing', { who })
    },
    humanDate () {
      const date = new Date(this.proposal.meta.createdDate)
      const offset = date.getTimezoneOffset()
      const minutes = date.getMinutes()
      date.setMinutes(minutes + offset)
      const locale = navigator.languages !== undefined ? navigator.languages[0] : navigator.language

      return date.toLocaleDateString(locale, {
        year: 'numeric', month: 'long', day: 'numeric'
      })
    },
    humanReason () {
      const reason = this.proposal.data.proposalData.reason
      return reason ? `"${reason}"` : undefined
    }
  }
}
</script>

<style lang="scss" scoped>
@import "../../../assets/style/_variables.scss";

$spaceVertical: $spacer-sm*3;

.c-wrapper {
  margin-top: $spaceVertical;
  padding-bottom: $spaceVertical;
  display: grid;
  grid-template-columns: auto 1fr;
  grid-template-areas:
    "avatar header"
    "main main";

  @include tablet {
    grid-template-areas:
      "avatar header"
      "avatar main";
  }

  &:not(:last-child) {
    border-bottom: 1px solid $general_1;
  }
}

.c-avatar {
  grid-area: avatar;
  width: 2.5rem;
  height: 2.5rem;
}

.c-header {
  grid-area: header;
  align-self: center;

  @include tablet {
    display: flex;
    justify-content: space-between;
  }
}

.c-main {
  grid-area: main;
  word-break: break-word;
  margin-top: $spacer-xs;
}

.c-avatar {
  margin-right: $spaceVertical;
  margin-bottom: $spacer-xs;
  margin-top: $spacer-xs;
  flex-shrink: 0
}
</style>
