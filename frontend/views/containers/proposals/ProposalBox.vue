<template lang='pug'>
li.c-wrapper
  user-image.c-avatar(:username='proposal.meta.username')
  .c-header
    h4.c-header-title(data-test='title' v-html='title')
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
      config: {
        reasonMaxLength: window.innerWidth < 769 ? 50 : 170
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
      const { identityContractID } = this.proposal.meta
      const username = this.$store.state[identityContractID].attributes.name
      const who = username === this.ourUsername ? L('You') : username
      const isAnyOpen = this.proposalHashes.some(hash => this.currentGroupState.proposals[hash].status === STATUS_OPEN)

      if (!isAnyOpen) {
        return L('{strong_}{who}{_strong} proposed:', { who, ...this.LTags('strong') })
      }

      return username === this.ourUsername
        ? L('{strong_}You{_strong} are proposing:', this.LTags('strong'))
        : L('{strong_}{who}{_strong} is proposing:', { who, ...this.LTags('strong') })
    },
    humanDate () {
      const date = new Date(this.proposal.meta.createdDate)
      const offset = date.getTimezoneOffset()
      const minutes = date.getMinutes()
      date.setMinutes(minutes + offset)
      const locale = navigator.languages !== undefined ? navigator.languages[0] : navigator.language

      return date.toLocaleDateString(locale, {
        year: 'numeric', month: 'short', day: 'numeric'
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

      this.ephemeral.isReasonHidden = false // eslint-disable-line vue/no-side-effects-in-computed-properties
      return `"${reason}"`
    }
  },
  methods: {
    toggleReason (e) {
      e.target.blur() // so the button doesnt look black.
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
    font-family: "Lato";
    font-weight: 400;

    ::v-deep strong {
      font-weight: 400;
    }
  }
}

.c-main {
  grid-area: main;
  margin-top: 1.5rem;
  word-break: break-word;
  min-width: 0; // So ellipsis work correctly inside grid.

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
