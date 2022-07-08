<template lang='pug'>
li.c-item-wrapper(data-test='proposalItem')
  .c-item
    .c-main
      .c-icons
        i(:class='iconClass')
        avatar-user.c-avatar(:username='proposal.meta.username' size='xs')

      .c-main-content
        p.has-text-bold(data-test='typeDescription')
          | {{typeDescription}}
          tooltip.c-tip(
            v-if='isToRemoveMe && proposal.status === statuses.STATUS_OPEN'
            direction='top'
            :text='L("You cannot vote.")'
          )
            .button.is-icon-smaller.is-primary
              i.icon-question

        p(data-test='title' v-safe-html='title')

        p.has-text-1(
          :class='{ "has-text-danger": proposal.status === statuses.STATUS_FAILED, "has-text-success": proposal.status === statuses.STATUS_PASSED }'
          data-test='statusDescription'
        ) {{statusDescription}}

        .c-reason(v-if='humanReason')
          p.has-text-1.c-reason-text(v-if='humanReason') {{ humanReason }}
          | &nbsp;
          button.link(
            v-if='shouldTruncateReason'
            @click='toggleReason'
          ) {{ ephemeral.isReasonHidden ? L('Read more') : L('Hide') }}

        // Note: $refs.voteMsg is used by children ProposalVoteOptions
        banner-scoped(ref='voteMsg' data-test='voteMsg')
        p.c-sendLink(v-if='invitationLink' data-test='sendLink')
          i18n(
            :args='{ user: proposal.data.proposalData.member}'
          ) Please send the following link to {user} so they can join the group:

          link-to-copy.c-invite-link(
            :link='invitationLink'
            tag='p'
          )
          i18n.has-text-danger(
            v-if='isExpiredInvitationLink'
          ) Expired
      proposal-vote-options(
        v-if='proposal.status === statuses.STATUS_OPEN'
        :proposalHash='proposalHash'
      )
</template>

<script>
import { mapGetters, mapState } from 'vuex'
import AvatarUser from '@components/AvatarUser.vue'
import currencies from '~/frontend/views/utils/currencies.js'
import { buildInvitationUrl } from '@model/contracts/voting/proposals.js'
import {
  PROPOSAL_INVITE_MEMBER,
  PROPOSAL_REMOVE_MEMBER,
  PROPOSAL_GROUP_SETTING_CHANGE,
  PROPOSAL_PROPOSAL_SETTING_CHANGE,
  PROPOSAL_GENERIC,
  STATUS_OPEN,
  STATUS_PASSED,
  STATUS_FAILED,
  STATUS_EXPIRED,
  STATUS_CANCELLED
} from '@model/contracts/voting/constants.js'
import { VOTE_FOR, VOTE_AGAINST, RULE_PERCENTAGE, RULE_DISAGREEMENT, getPercentFromDecimal } from '@model/contracts/voting/rules.js'
import ProposalVoteOptions from '@containers/proposals/ProposalVoteOptions.vue'
import BannerScoped from '@components/banners/BannerScoped.vue'
import LinkToCopy from '@components/LinkToCopy.vue'
import Tooltip from '@components/Tooltip.vue'
import { INVITE_STATUS } from '@model/contracts/constants.js'
import L from '@view-utils/translations.js'
import { TABLET } from '@view-utils/breakpoints.js'

export default ({
  name: 'ProposalItem',
  props: {
    proposalHash: String
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
    BannerScoped,
    ProposalVoteOptions,
    AvatarUser,
    LinkToCopy,
    Tooltip
  },
  computed: {
    ...mapGetters([
      'currentGroupState',
      'groupMembersCount',
      'userDisplayName',
      'ourUsername'
    ]),
    ...mapState(['currentGroupId']),
    statuses () {
      return { STATUS_OPEN, STATUS_PASSED, STATUS_FAILED, STATUS_EXPIRED, STATUS_CANCELLED }
    },
    proposal () {
      return this.currentGroupState.proposals[this.proposalHash]
    },
    title () {
      const username = this.proposal.meta.username
      const isOwnProposal = username === this.ourUsername

      if (this.proposal.status === STATUS_OPEN) {
        return isOwnProposal
          ? L('You are proposing')
          : L('{username} is proposing', { username: `${username}` })
      }

      // Note: In English, no matter the subject, the wording is the same,
      // but in other languages the wording is different (ex: Portuguese)
      return isOwnProposal
        ? L('You proposed')
        : L('{username} proposed', { username: `${username}` })
    },
    proposalType () {
      return this.proposal.data.proposalType
    },
    isOurProposal () {
      return this.proposal.meta.username === this.ourUsername
    },
    isToRemoveMe () {
      return this.proposalType === PROPOSAL_REMOVE_MEMBER && this.proposal.data.proposalData.member === this.ourUsername
    },
    typeDescription () {
      return {
        [PROPOSAL_INVITE_MEMBER]: () => L('Add {user} to group.', {
          user: this.proposal.data.proposalData.member
        }),
        [PROPOSAL_REMOVE_MEMBER]: () => {
          const user = this.userDisplayName(this.proposal.data.proposalData.member)
          return this.isToRemoveMe
            ? L('Remove {user} (you) from the group.', { user })
            : L('Remove {user} from the group.', { user })
        },
        [PROPOSAL_GROUP_SETTING_CHANGE]: () => {
          const { setting } = this.proposal.data.proposalData
          // TODO layout for this type of proposal. Waiting for designs.
          const variablesMap = {
            'mincomeAmount': () => {
              const { mincomeCurrency, currentValue, proposedValue } = this.proposal.data.proposalData

              return {
                setting: L('mincome'),
                currentValue: currencies[mincomeCurrency].displayWithCurrency(currentValue),
                proposedValue: currencies[mincomeCurrency].displayWithCurrency(proposedValue)
              }
            }
          }[setting]()

          return L('Change {setting} from {currentValue} to {proposedValue}', variablesMap)
        },
        [PROPOSAL_PROPOSAL_SETTING_CHANGE]: () => {
          const { current, ruleName, ruleThreshold } = this.proposal.data.proposalData

          if (current.ruleName === ruleName) {
            return {
              [RULE_DISAGREEMENT]: () => L('Change disagreement number from {X} to {N}.', {
                X: current.ruleThreshold,
                N: ruleThreshold
              }),
              [RULE_PERCENTAGE]: () => L('Change percentage based from {X} to {N}.', {
                X: getPercentFromDecimal(current.ruleThreshold) + '%',
                N: getPercentFromDecimal(ruleThreshold) + '%'
              })
            }[ruleName]()
          }

          return {
            [RULE_DISAGREEMENT]: () => L('Change from a percentage based voting system to a disagreement based one, with a maximum of {N} “no” votes.', {
              N: ruleThreshold
            }),
            [RULE_PERCENTAGE]: () => L('Change from a disagreement based voting system to a percentage based one, with minimum agreement of {percent}.', {
              percent: getPercentFromDecimal(ruleThreshold) + '%'
            })
          }[ruleName]()
        },
        [PROPOSAL_GENERIC]: () => L('TODO: Change [generic] from [current] to [new-value]', {})
      }[this.proposalType]()
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
    statusDescription () {
      const votes = Object.values(this.proposal.votes)
      const yay = votes.filter(v => v === VOTE_FOR).length
      const nay = votes.filter(v => v === VOTE_AGAINST).length
      const date = this.humanDate
      const total = yay + nay
      switch (this.proposal.status) {
        case STATUS_OPEN: {
          const excludeVotes = this.proposalType === PROPOSAL_REMOVE_MEMBER ? 1 : 0

          return L('{count} out of {total} members voted on {date}', {
            count: votes.length,
            total: this.groupMembersCount - excludeVotes,
            date
          })
        }
        case STATUS_FAILED: {
          return L('Proposal refused with {nay} against out of {total} total votes on {date}', { nay, total, date })
        }
        case STATUS_CANCELLED: {
          return L('Proposal cancelled.')
        }
        case STATUS_PASSED: {
          return L('Proposal accepted with {yay} in favor out of {total} total votes on {date}', { yay, total, date })
        }
        default:
          return `TODO status: ${this.proposal.status}`
      }
    },
    iconClass () {
      const type = {
        [PROPOSAL_INVITE_MEMBER]: 'icon-user-plus',
        [PROPOSAL_REMOVE_MEMBER]: 'icon-user-minus',
        [PROPOSAL_GROUP_SETTING_CHANGE]: 'icon-coins',
        [PROPOSAL_PROPOSAL_SETTING_CHANGE]: 'icon-vote-yea',
        [PROPOSAL_GENERIC]: 'icon-poll'
      }

      const status = {
        [STATUS_OPEN]: 'has-background-primary has-text-primary',
        [STATUS_PASSED]: 'icon-check has-background-success has-text-success',
        [STATUS_FAILED]: 'icon-times has-background-danger has-text-danger',
        [STATUS_CANCELLED]: 'has-background-general has-text-1'
      }

      if ([STATUS_PASSED, STATUS_FAILED].includes(this.proposal.status)) {
        // Show the status icon, no matter the proposal type
        return `${status[this.proposal.status]} icon-round`
      }

      return `${type[this.proposalType]} ${status[this.proposal.status]} icon-round`
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
    },
    invitationLink () {
      if (this.proposalType === PROPOSAL_INVITE_MEMBER &&
        this.proposal.status === STATUS_PASSED &&
        this.isOurProposal
      ) {
        const secret = this.proposal.payload.inviteSecret
        if (this.currentGroupState.invites[secret].status === INVITE_STATUS.VALID) {
          return buildInvitationUrl(this.currentGroupId, this.proposal.payload.inviteSecret)
        }
      }
      return false
    },
    isExpiredInvitationLink () {
      if (this.proposalType === PROPOSAL_INVITE_MEMBER &&
        this.proposal.status === STATUS_PASSED &&
        this.isOurProposal
      ) {
        const secret = this.proposal.payload.inviteSecret
        if (this.currentGroupState.invites[secret].status === INVITE_STATUS.VALID &&
          this.proposal.payload.expires < Date.now()) {
          return true
        }
      }
      return false
    }
  },
  methods: {
    toggleReason (e) {
      e.target.blur() // so the button doesnt remain focused (with black color).
      this.ephemeral.isReasonHidden = !this.ephemeral.isReasonHidden
    }
  }
}: Object)
</script>

<style lang="scss" scoped>
@import "@assets/style/_variables.scss";

.c-item-wrapper {
  margin-top: 2rem;

  &:not(:last-child) {
    padding-bottom: 2rem;
    border-bottom: 1px solid $general_1;
  }
}

.c-item {
  display: flex;
  align-items: flex-start;

  @include phone {
    flex-wrap: wrap;
  }
}

.c-main {
  grid-template-columns: auto 1fr auto;
  display: grid;
  grid-template-areas: "icons content actions";
  width: 100%;

  @include phone {
    grid-template-areas: "icons content content"
                         "icons actions actions";
  }

  &-content {
    flex-grow: 1;
  }
}

.c-tip {
  margin-left: 0.25rem;
}

.c-sendLink {
  border-radius: 0.25rem;
  background-color: $general_2;
  padding: 1.1875rem 1rem;
  margin-top: 1rem;
  display: grid;

  @include tablet {
    padding: 1rem;
  }

  .c-invite-link {
    ::v-deep .c-copy-button {
      background: $background_0;
    }
  }
}

.icon-round {
  @include phone {
    margin-left: 0.5rem;
  }
}

.c-main-content {
  word-break: break-word;
  grid-area: content;
}

.c-icons {
  position: relative;
  align-self: flex-start;
  grid-area: icons;

  .icon-round {
    width: 3.75rem;
    height: 3.75rem;
    display: grid;
    align-items: center;

    @include phone {
      width: 2.75rem;
      height: 2.75rem;
    }
  }

  .c-avatar {
    position: absolute;
    bottom: -0.2rem;
    right: 1rem;

    @include phone {
      display: none;
    }
  }
}

.c-reason {
  position: relative;
  margin-top: 1rem;

  &-text {
    display: inline;
  }
}
</style>
