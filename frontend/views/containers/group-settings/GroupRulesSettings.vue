<template lang='pug'>
  ul.c-wrapper(data-test='votingRules')
    li.cardBox.c-card(
      v-for='rule in votingRulesSorted'
      :class='{ isActive: isRuleActive(rule) }'
      :aria-current='isRuleActive(rule)'
      :data-test='rule'
    )
      p.is-title-4 {{ config[rule].title }}
      p.has-text-1.c-expl(v-safe-html='config[rule].explanation')
      i18n.pill.is-primary.c-active(v-if='isRuleActive(rule)') Active

      dl.c-status(v-if='isRuleActive(rule)')
        dt.c-status-term {{ config[rule].status }}
        dd.c-status-desc
          span(v-safe-html='votingValue(rule)' data-test='ruleStatus')
          button.link(
            tag='button'
            data-test='changeRule'
            @click='openVotingProposal(rule)'
          ) {{ groupShouldPropose ? L('Propose change') : L('Change') }}

      banner-simple.c-banner(
        severity='info'
        data-test='ruleAdjusted'
        v-if='groupShouldPropose && votingRuleAdjusted(rule)'
      ) {{ votingRuleAdjusted(rule) }}

      button.link(
        v-if='!isRuleActive(rule)'
        data-test='changeRule'
        @click='openVotingProposal(rule)'
      ) {{ groupShouldPropose ? L('Propose changing to this system') : L('Change to this system') }}
</template>

<script>
import sbp from '@sbp/sbp'
import { mapGetters } from 'vuex'
import { RULE_PERCENTAGE, RULE_DISAGREEMENT, getThresholdAdjusted, getCountOutOfMembers, getPercentFromDecimal } from '@model/contracts/voting/rules.js'
import { OPEN_MODAL } from '@utils/events.js'
import L from '@view-utils/translations.js'
import BannerSimple from '@components/banners/BannerSimple.vue'

export default ({
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
      'groupProposalSettings',
      'groupShouldPropose'
    ]),
    proposalSettings () {
      // note: a console error can happen here if we're on this page and logout
      // because the group disappears. it's not a big deal though
      return this.groupProposalSettings() || {}
    },
    votingRulesSorted () {
      return this.proposalSettings.rule === RULE_DISAGREEMENT ? [RULE_DISAGREEMENT, RULE_PERCENTAGE] : [RULE_PERCENTAGE, RULE_DISAGREEMENT]
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
    openVotingProposal (rule) {
      console.log('rule', rule)
      sbp('okTurtles.events/emit', OPEN_MODAL, 'ChangeVotingRules', { rule })
    },
    isRuleActive (rule) {
      return rule === this.proposalSettings.rule
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

      return {
        [RULE_DISAGREEMENT]: () => {
          if (!this.groupShouldPropose || count === adjusted) {
            return L('{b_}{count}{_b}', { count, ...HTMLTags })
          }
          return L('{b_}{count}{_b} {sm_}(adjusted to {nr}*){_sm}', { count, nr: adjusted, ...HTMLTags })
        },
        [RULE_PERCENTAGE]: () => {
          const percent = getPercentFromDecimal(this.thresholdOriginal) + '%'
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
        }
      }[option]()
    },
    votingRuleAdjusted (ruleName) {
      if (!this.groupShouldPropose || !this.isRuleActive(ruleName) || this.thresholdAdjusted === this.thresholdOriginal) {
        return ''
      }

      return {
        [RULE_DISAGREEMENT]: L('*This value was automatically adjusted because your group is too small for the disagreement number.'),
        [RULE_PERCENTAGE]: L('*This value was automatically adjusted because there should always be at least 2 "yes" votes.')
      }[ruleName]
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
  margin-bottom: -0.5rem;

  &-term,
  &-desc > :first-child {
    margin-right: 0.5rem;
  }

  &-term {
    display: inline-block;
    margin-bottom: 0.5rem;
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
