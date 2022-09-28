<template lang='pug'>
ul.c-wrapper(data-test='votingRules')
  li.cardBox.c-card.is-active(
    :data-test='config.rule'
    :aria-current='true'
  )
    p.is-title-4 {{ config.title }}
    p.has-text-1.c-expl(v-safe-html='config.explanation')
    i18n.pill.is-primary.c-active Active

    dl.c-status
      dt.c-status-term {{ config.status }}
      dd.c-status-desc
        span(v-safe-html='votingValue(config.rule)' data-test='ruleStatus')

    button.link(
      type='button'
      data-test='changeRule'
      @click='openVotingProposal'
    ) {{ groupShouldPropose ? L('Propose change') : L('Change') }}

  banner-simple.c-banner(
    serverity='info'
    data-test='ruleAdjusted'
    v-if='groupShouldPropose && votingRuleAdjusted()'
  ) {{ votingRuleAdjusted() }}
</template>

<script>
import sbp from '@sbp/sbp'
import { mapGetters } from 'vuex'
import { RULE_PERCENTAGE, getThresholdAdjusted, getCountOutOfMembers, getPercentFromDecimal } from '@model/contracts/shared/voting/rules.js'
import { OPEN_MODAL } from '@utils/events.js'
import { L } from '@common/common.js'
import BannerSimple from '@components/banners/BannerSimple.vue'

export default ({
  name: 'GroupVotingSystem',
  components: {
    BannerSimple
  },
  data: () => ({
    config: {
      rule: RULE_PERCENTAGE,
      title: L('Percentage based'),
      explanation: L('Proposals are accepted when the required percentage of members agree to the proposal.'),
      status: L('Percentage of members that need to agree:')
    }
  }),
  computed: {
    ...mapGetters([
      'groupMembersCount',
      'groupProposalSettings',
      'groupShouldPropose'
    ]),
    proposalSettings () {
      // note: a console error can happen here if we're on this page and logout
      // because the group disappears. it's not a big deal though
      return this.groupProposalSettings() || {}
    },
    votingRuleSettings () {
      return this.proposalSettings.ruleSettings[this.proposalSettings.rule]
    },
    thresholdOriginal () {
      return this.votingRuleSettings.threshold
    },
    thresholdAdjusted () {
      return getThresholdAdjusted(this.proposalSettings.rule, this.thresholdOriginal, this.groupMembersCount)
    }
  },
  methods: {
    openVotingProposal () {
      sbp('okTurtles.events/emit', OPEN_MODAL, 'ChangeVotingRules', { rule: this.config.rule })
    },
    votingValue () {
      const HTMLTags = {
        b_: '<span class="has-text-bold">',
        _b: '</span>',
        sm_: '<span class="has-text-1 has-text-small">',
        _sm: '</span>'
      }
      const count = this.thresholdOriginal
      const adjusted = this.thresholdAdjusted
      const percent = getPercentFromDecimal(count) + '%'
      const LArgs = {
        percent,
        count: getCountOutOfMembers(this.groupMembersCount, adjusted),
        total: Math.max(3, this.groupMembersCount), // 3 = minimum groupSize to vote,
        ...HTMLTags
      }

      if (!this.groupShouldPropose) {
        return L('{b_}{percent}{_b}', LArgs)
      }
      if (count === adjusted) {
        return L('{b_}{percent}{_b} {sm_}({count} out of {total} members){_sm}', LArgs)
      }
      return L('{b_}{percent}{_b} {sm_}({count}* out of {total} members){_sm}', LArgs)
    },
    votingRuleAdjusted () {
      if (!this.groupShouldPropose || this.thresholdAdjusted === this.thresholdOriginal) {
        return ''
      }

      return L('*This value was automatically adjusted because there should always be at least 2 "yes" votes.')
    }
  }
}: Object)
</script>

<style lang="scss" scoped>
@import "@assets/style/_variables.scss";

.c-wrapper {
  margin-top: 1.5rem;
}

.c-active {
  position: absolute;
  top: 1rem;
  right: 1rem;
}

.c-expl {
  margin-bottom: 1.5rem;
}

.c-status {
  margin-bottom: 0.5rem;

  &-term,
  &-desc > :first-child {
    margin-right: 0.5rem;
  }

  &-term {
    display: inline-block;
  }

  &-desc {
    display: inline;

    @include phone {
      display: block;
    }
  }
}

.c-banner {
  margin-top: 1.5rem;
}

@include tablet {
  .c-card {
    padding-left: 1.5rem;
    padding-right: 1.5rem;
  }

  .c-active {
    right: 1.5rem;
  }
}
</style>
