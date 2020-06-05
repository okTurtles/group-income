<template lang='pug'>
  ul.c-wrapper(data-test='votingRules')
    li.cardBox(
      v-for='rule in votingRulesSorted'
      :class='{ isActive: isRuleActive(rule) }'
      :aria-current='isRuleActive(rule)'
      :data-test='rule'
    )
      p.is-title-4 {{ config[rule].title }}
      p.has-text-1.c-expl(v-html='config[rule].explanation')
      i18n.pill.is-primary.c-active(v-if='isRuleActive(rule)') Active

      dl.c-status(v-if='isRuleActive(rule)')
        dt.c-status-term {{ config[rule].status }}
        dd.c-status-desc
          span(v-html='votingValue(rule)' data-test='ruleStatus')
          i18n.link(
            tag='button'
            data-test='changeRule'
            @click='openVotingProposal(rule)'
          ) Change

      banner-simple.c-banner(
        severity='info'
        data-test='ruleAdjusted'
        v-if='votingRuleAdjusted(rule)'
      ) {{ votingRuleAdjusted(rule) }}

      i18n.link(
        v-if='!isRuleActive(rule)'
        tag='button'
        data-test='changeRule'
        @click='openVotingProposal(rule)'
      ) Change to this voting system
</template>

<script>
import sbp from '~/shared/sbp.js'
import { mapGetters } from 'vuex'
import { RULE_PERCENTAGE, RULE_DISAGREEMENT, getThresholdAdjusted, getPercentageToCount } from '@model/contracts/voting/rules.js'
import { OPEN_MODAL } from '@utils/events.js'
import L from '@view-utils/translations.js'
import BannerSimple from '@components/banners/BannerSimple.vue'

export default {
  name: 'GroupVotingSystem',
  components: {
    BannerSimple
  },
  data: () => ({
    config: {
      [RULE_PERCENTAGE]: {
        title: L('Percentage based'),
        explanation: L('Proposals are accepted when the required percentage of members agree to the proposal.'),
        status: L('Percentage of members that need to agree:')
      },
      [RULE_DISAGREEMENT]: {
        title: L('Disagreement number'),
        explanation: L('Proposals are rejected when a certain number of members disagree with the proposal.'),
        status: L('Maximum number of "no" votes:')
      }
    }
  }),
  computed: {
    ...mapGetters([
      'groupMembersCount',
      'groupVotingRule'
    ]),
    votingRulesSorted () {
      return this.groupVotingRule.rule === RULE_DISAGREEMENT ? [RULE_DISAGREEMENT, RULE_PERCENTAGE] : [RULE_PERCENTAGE, RULE_DISAGREEMENT]
    },
    votingRuleSettings () {
      return this.groupVotingRule.ruleSettings[this.groupVotingRule.rule]
    },
    thresholdOriginal () {
      return this.votingRuleSettings.threshold
    },
    thresholdAdjusted () {
      return getThresholdAdjusted(this.groupVotingRule.rule, this.thresholdOriginal, this.groupMembersCount)
    }
  },
  methods: {
    openVotingProposal (rule) {
      sbp('okTurtles.events/emit', OPEN_MODAL, 'ChangeVotingRules', { rule })
    },
    isRuleActive (rule) {
      return rule === this.groupVotingRule.rule
    },
    votingRuleAdjusted (ruleName) {
      if (!this.isRuleActive(ruleName) || this.thresholdAdjusted === this.thresholdOriginal) {
        return ''
      }

      if (ruleName === RULE_DISAGREEMENT) {
        return L('*This value was automatically adjusted because your group is currently smaller than the disagreement number.')
      }
      if (ruleName === RULE_PERCENTAGE) {
        return L('*This value was automatically adjusted because there should always be at least 2 "yes" votes.')
      }

      return ''
    },
    votingValue (option) {
      const HTMLTags = {
        b_: '<span class="has-text-bold">',
        _b: '</span>',
        sm_: '<span class="has-text-1 has-text-small">',
        _sm: '</span>'
      }
      const count = this.thresholdOriginal
      const adjusted = this.thresholdAdjusted

      if (option === RULE_PERCENTAGE) {
        const percent = this.thresholdOriginal * 100 + '%'
        const membersCount = Math.max(3, this.groupMembersCount) // 3 = minimum groupSize to vote
        const LArgs = {
          percent,
          count: getPercentageToCount(membersCount, adjusted),
          total: membersCount,
          ...HTMLTags
        }

        if (count === adjusted) {
          return L('{b_}{percent}{_b} {sm_}({count} out of {total} members){_sm}', LArgs)
        }
        return L('{b_}{percent}{_b} {sm_}({count}* out of {total} members){_sm}', LArgs)
      } else if (option === RULE_DISAGREEMENT) {
        if (count === adjusted) {
          return L('{b_}{count}{_b}', { count, ...HTMLTags })
        }
        return L('{b_}{count}{_b} {sm_}(adjusted to {nr}*){_sm}', { count, nr: adjusted, ...HTMLTags })
      }
    }
  }
}
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
  &-term,
  &-desc {
    display: inline;
  }

  &-term,
  &-desc > :first-child {
    margin-right: 0.5rem;
  }

  &-desc {
    .link {
      margin-top: 0.5rem;
    }

    @include phone {
      display: block;
    }
  }
}

.c-banner {
  margin-top: 1rem;
}

</style>
