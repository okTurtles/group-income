<template lang='pug'>
li.c-wrapper
  user-image.c-avatar(:username='proposal.meta.username')
  .c-header
    h4.has-text-bold(data-test='title') {{title}}:
    span(v-if='displayDate') {{humanDate}}
  .c-main
    p.has-text-1 "{{proposal.data.proposalData.reason}}"
    ul
      proposal-item(
        v-for='hash in proposalHashes'
        :key='hash'
        :proposalHash='hash'
      )
</template>

<script>
import { mapGetters } from 'vuex'
import UserImage from '@containers/UserImage.vue'
import ProposalItem from './ProposalItem.vue'
import { convertDateToLocale } from '~shared/dateSync.js'
import { STATUS_OPEN } from '@model/contracts/voting/proposals.js'

export default {
  // TODO rename containers/proposals/ProposalVote
  name: 'ProposalBox',
  props: {
    proposalHashes: Array, // [hash1, hash2, ...]
    displayDate: Boolean
  },
  components: {
    ProposalItem,
    UserImage
  },
  computed: {
    ...mapGetters([
      'currentGroupState',
      'currentUserIdentityContract'
    ]),
    proposal () {
      // Pick the 1st hash as guidance/pivot to this group of proposals.
      const pivot = this.proposalHashes[0]
      return this.currentGroupState.proposals[pivot]
    },
    title () {
      const { identityContractID } = this.proposal.meta
      const username = this.$store.state[identityContractID].attributes.name
      const currentUsername = this.currentUserIdentityContract.attributes.name
      const who = username === currentUsername ? 'You' : username
      const isAnyOpen = this.proposalHashes.some(hash => this.currentGroupState.proposals[hash].status === STATUS_OPEN)

      if (!isAnyOpen) {
        return this.L('{who} proposed', { who })
      }
      return username === currentUsername
        ? this.L('You are proposing')
        : this.L('{who} is proposing', { who })
    },
    humanDate () {
      const date = convertDateToLocale(this.proposal.meta.createdDate)

      // TODO: Display date format based on locale
      return date.toLocaleDateString('en-EN', {
        year: 'numeric', month: 'long', day: 'numeric'
      })
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
  margin-top: $spacer-xs;
  word-break: break-word;
}

.c-avatar {
  margin-right: $spaceVertical;
  margin-bottom: $spacer-xs;
  margin-top: $spacer-xs; // visually better aligned
  flex-shrink: 0
}
</style>
