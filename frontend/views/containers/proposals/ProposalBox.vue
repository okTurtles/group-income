<template lang='pug'>
li.c-wrapper
  user-image.c-avatar(:username='proposal.meta.username')
  .c-header
    h4.has-text-bold(data-test='title') {{ title }}:
    span.has-text-1 {{ humanDate }}
  .c-main
    ul
      proposal-item(v-for='hash in proposalHashes' :key='hash' :proposalHash='hash')
    transition(name='expand')
      .c-reason(v-if='!ephemeral.isReasonVisible')
        p.has-text-1.c-reason-text(v-if='humanReason') {{ humanReason }}
        i18n.link.c-reason-expand(tag='button' @click='toggleReason') Read more
      .c-reason.full(v-else)
        p.has-text-1.c-reason-text(v-if='humanReason') {{ humanReason }}
        i18n.link.c-reason-link(tag='button' @click='toggleReason') Hide
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
  data () {
    return {
      ephemeral: {
        isReasonVisible: false
      }
    }
  },
  components: {
    ProposalItem,
    UserImage
  },
  computed: {
    ...mapGetters(['currentGroupState', 'ourUserIdentityContract']),
    proposal () {
      // Pick the 1st hash as guidance/pivot for this group of proposals
      return this.currentGroupState.proposals[this.proposalHashes[0]]
    },
    title () {
      const { identityContractID } = this.proposal.meta
      const username = this.$store.state[identityContractID].attributes.name
      const currentUsername = this.ourUserIdentityContract.attributes.name
      const who = username === currentUsername ? L('You') : username
      const isAnyOpen = this.proposalHashes.some(
        hash => this.currentGroupState.proposals[hash].status === STATUS_OPEN
      )

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
      const locale =
        navigator.languages !== undefined
          ? navigator.languages[0]
          : navigator.language

      return date.toLocaleDateString(locale, {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      })
    },
    humanReason () {
      const reason = this.proposal.data.proposalData.reason
      return reason
        ? `"${reason} Let's add a very long text just to debug. You can find this at ProposalBox.vue around line 83. It's inside a humanReason function that returns this string. TODO - remove this before merge!"`
        : undefined
    }
  },
  methods: {
    toggleReason () {
      this.ephemeral.isReasonVisible = !this.ephemeral.isReasonVisible
    }
  }
}
</script>

<style lang="scss" scoped>
@import "@assets/style/_variables.scss";

$spaceVertical: $spacer-sm * 3;

.c-wrapper {
  margin-top: $spaceVertical;
  padding-bottom: $spaceVertical;
  display: grid;
  grid-template-columns: auto 1fr;
  grid-template-areas:
    "header header"
    "main main";

  @include tablet {
    grid-template-areas:
      "avatar header"
      "null main";
  }

  &:not(:last-child) {
    border-bottom: 1px solid $general_1;
  }
}

.c-avatar {
  grid-area: avatar;
  width: 2.5rem;
  height: 2.5rem;
  margin-right: $spaceVertical;
  flex-shrink: 0;

  @include phone {
    display: none;
  }
}

.c-header {
  grid-area: header;
  display: flex;
  justify-content: space-between;
}

.c-main {
  grid-area: main;
  word-break: break-word;
  min-width: 0; // So ellipsis work correctly inside grid.
}

.c-reason {
  position: relative;
  margin-top: 1.5rem;

  &:not(.full) {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    max-height: 2.5rem; // 2 lines
    overflow: hidden;
  }

  &.full {
    display: block;
  }

  &:not(.full) &-text {
    // white-space: nowrap;
    // overflow: hidden;
    // text-overflow: clip;
  }

  &-expand {
    flex-shrink: 0;
    word-wrap: normal;
    margin-left: $spacer-xs;
    position: absolute;
    bottom: 0;
    right: 0;
    z-index: 1;

    &::before {
      content: "";
      position: absolute;
      top: 0;
      right: 0;
      background-image: linear-gradient(to right, #ffffff00, #ffffff 30px);
      color: var(--text_1);
      display: block;
      width: calc(100% + 40px);
      height: 100%;
      z-index: -1;
    }
  }
}
</style>
