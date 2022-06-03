<template lang='pug'>
.wrapper(data-test='rulesStep')
  i18n.is-title-4.steps-title(tag='h4') 4. Voting System

  .card
    fieldset.c-step
      i18n.has-text-bold(tag='legend') Which voting system would you like to use?
      i18n.has-text-1.c-desc(tag='p') You will need to use this system to vote on proposals. You can propose for example, to add or remove members, or to change your group’s mincome value.

      .cardBox.c-box(v-for='rule in group.rulesOrder' :class='{isActive: group.ruleName === rule }')
        .c-box-option
          label.checkbox.c-option(:data-test='rule')
            input.input(
              type='radio'
              :value='rule'
              :checked='group.ruleName === rule'
              @change='setRule(rule)'
            )
            span
              span.has-text-bold {{ config[rule].label }}
              span.has-text-1.c-option-hint(v-safe-html='config[rule].hint')
          img.c-box-img(src='/assets/images/rule-placeholder.png' alt='')

        transition-expand
          div(v-if='rule === group.ruleName')
            voting-rules-input.c-input(:rule='rule' :value='group.ruleThreshold[rule]' @update='setThreshold')

      i18n.help You can change this later in your Group Settings.
    slot
</template>

<script>
import {
  L
} from '/assets/js/common.js' // eslint-disable-line import/no-absolute-path
import { RULE_PERCENTAGE, RULE_DISAGREEMENT } from '@model/contracts/shared/voting/rules.js'
import TransitionExpand from '@components/TransitionExpand.vue'
import VotingRulesInput from '@components/VotingRulesInput.vue'

export default ({
  name: 'GroupRules',
  props: {
    group: { type: Object },
    $v: { type: Object }
  },
  components: {
    TransitionExpand,
    VotingRulesInput
  },
  data: () => ({
    config: {
      [RULE_PERCENTAGE]: {
        label: L('Percentage based'),
        hint: L('Define the percentage of members who will need to agree to a proposal.')
      },
      [RULE_DISAGREEMENT]: {
        label: L('Disagreement number'),
        hint: L('Define the number of people required to block a proposal.')
      }
    }
  }),
  created () {

  },
  methods: {
    setRule (rule) {
      this.$v.form.ruleName.$touch()
      this.$v.form.ruleThreshold[rule].$touch()
      this.$emit('input', {
        data: {
          ruleName: rule,
          ruleThreshold: {
            ...this.group.ruleThreshold,
            [rule]: this.group.ruleThreshold[rule]
          }
        }
      })
    },
    setThreshold (threshold) {
      this.$v.form.ruleThreshold[this.group.ruleName].$touch()
      this.$emit('input', {
        data: {
          ruleThreshold: {
            ...this.group.ruleThreshold,
            [this.group.ruleName]: threshold
          }
        }
      })
    }
  }
}: Object)
</script>

<style lang="scss" scoped>
@import "@assets/style/_variables.scss";

.c-step {
  margin-bottom: 2rem;
}

.c-desc {
  margin-top: 0.25rem;
  margin-bottom: 1.5rem;
}

.c-box {
  margin-bottom: 1rem;

  &-option {
    display: flex;
    align-items: center;
  }

  &-img {
    max-width: 100%;
    margin: -1rem 0;

    @include phone {
      display: none;
    }
  }
}

.c-option {
  flex: 1;

  > :last-child {
    white-space: normal;

    &::before {
      margin-right: 1rem;
    }
  }

  &-hint {
    display: block;
    margin-top: 0.25rem;
    margin-left: 1.85rem;
  }
}

.c-input {
  margin: 2rem 0 0.5rem;

  @include tablet {
    margin-left: 1.8rem;
    margin-right: 1.8rem;
  }
}
</style>
