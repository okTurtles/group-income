<template lang='pug'>
li.c-wrapper
  user-image.c-avatar(:username='proposal.meta.username')
  .c-header
    h4.is-title-4.c-header-title(data-test='title' v-html='title')
    span.has-text-1 {{ humanDate }}
  .c-main
    ul
      proposal-item(v-for='hash in proposalHashes' :key='hash' :proposalHash='hash')

    .c-reason(v-if='humanReason')
      p.has-text-1.c-reason-text(v-if='humanReason') {{ humanReason }}
      | &nbsp;
      button.link(
        v-if='shouldTruncateReason'
        @click='toggleReason'
      ) {{ ephemeral.isReasonHidden ? L('Read more') : L('Hide') }}
</template>

<script>
import { mapGetters } from 'vuex'
import L from '@view-utils/translations.js'
import UserImage from '@components/UserImage.vue'
import ProposalItem from './ProposalItem.vue'
import { STATUS_OPEN } from '@model/contracts/voting/proposals.js'
import { TABLET } from '@view-utils/breakpoints.js'

export default {
  name: 'ProposalBox',
  props: {
    proposalHashes: Array // [hash1, hash2, ...]
  },
  data () {
    return {
      config: {
        reasonMaxLength: window.innerWidth < TABLET ? 50 : 170
      },
      ephemeral: {
        isReasonHidden: true
      }
    }
  },
  components: {
    ProposalItem,
    UserImage
  },
  created () {
    this.ephemeral.isReasonHidden = this.shouldTruncateReason
  },
  computed: {
    ...mapGetters([
      'currentGroupState',
      'ourUsername'
    ]),
    proposal () {
      // Pick the 1st hash as guidance/pivot for this group of proposals
      return this.currentGroupState.proposals[this.proposalHashes[0]]
    },
    title () {
      const username = this.proposal.meta.username
      const isOwnProposal = username === this.ourUsername
      const isAnyOpen = this.proposalHashes.some(hash => this.currentGroupState.proposals[hash].status === STATUS_OPEN)

      if (isAnyOpen) {
        return isOwnProposal
          ? L('{strong_}You{_strong} are proposing:', this.LTags('strong'))
          : L('{username} is proposing:', { username: `<strong>${username}</strong>` })
      }

      // Note: In English, no matter the subject, the wording is the same,
      // but in other languages the wording is different (ex: Portuguese)
      return isOwnProposal
        ? L('{strong_}You{_strong} proposed:', this.LTags('strong'))
        : L('{username} proposed:', { username: `<strong>${username}</strong>` })
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
    shouldTruncateReason () {
      const reason = this.proposal.data.proposalData.reason
      const threshold = 40 // avoid clicking "read more" and see only a few more characters.
      return reason.length > this.config.reasonMaxLength + threshold
    },
    humanReason () {
      const reason = this.proposal.data.proposalData.reason
      const maxlength = this.config.reasonMaxLength
      if (this.ephemeral.isReasonHidden && this.shouldTruncateReason) {
        // Prevent "..." to be added after an empty space. ex: "they would ..." -> "they would..."
        const charToTruncate = reason.charAt(maxlength - 1) === ' ' ? maxlength - 1 : maxlength
        return `"${reason.substr(0, charToTruncate)}..."`
      }

      return reason ? `"${reason}"` : ''
    }
  },
  methods: {
    toggleReason (e) {
      e.target.blur() // so the button doesnt remain focused (with black color).
      this.ephemeral.isReasonHidden = !this.ephemeral.isReasonHidden
    }
  }
}
</script>

<style lang="scss" scoped>
@import "@assets/style/_variables.scss";

.c-wrapper {
  margin-top: $spacer-lg;
  display: grid;
  grid-template-columns: auto 1fr;
  grid-template-areas:
    "header header"
    "main main";

  &:first-child {
    margin-top: 1.5rem;
  }

  &:not(:last-child) {
    padding-bottom: $spacer-lg;
    border-bottom: 1px solid $general_1;
  }

  @include tablet {
    grid-template-areas:
      "avatar header"
      "null main";
  }
}

.c-avatar {
  grid-area: avatar;
  width: 2.5rem;
  height: 2.5rem;
  margin-right: $spacer;
  flex-shrink: 0;

  @include phone {
    display: none;
  }
}

::v-deep .c-header {
  grid-area: header;
  display: flex;
  justify-content: space-between;
  align-items: center;

  &-title {
    @include phone {
      font-family: "Lato";
      font-weight: 400;

      ::v-deep strong {
        font-weight: 400;
      }
    }
  }
}

.c-main {
  grid-area: main;
  margin-top: 1.5rem;
  word-break: break-word;
  min-width: 0; // So ellipsis works correctly inside grid. pls refer to a discussion here(https://github.com/okTurtles/group-income-simple/pull/765#issuecomment-551691920) for the context.

  @include tablet {
    margin-top: $spacer;
  }
}

.c-reason {
  position: relative;
  margin-top: 1.5rem;

  &-text {
    display: inline;
  }
}
</style>
