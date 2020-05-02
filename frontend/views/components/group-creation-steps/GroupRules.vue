<template lang='pug'>
.wrapper(data-test='rulesStep')
  i18n.is-title-4.steps-title(tag='h4') 4. Voting System

  .card
    fieldset.c-step
      i18n.has-text-bold(tag='legend') Which voting system would you like to use?
      i18n.has-text-1.c-desc(tag='p') You will need to use this system to vote on proposals. You can propose for example, to add or remove members, or to change your group’s mincome value.

      .cardBox.c-box(v-for='option in group.ruleOrder' :class='{isActive: form.option === option }')
        .c-box-option
          label.checkbox.c-option
            input.input(type='radio' name='rule' :value='option' @change='setOption(option)')
            span
              span.has-text-bold {{ config[option].optionLabel }}
              span.has-text-1.c-option-hint(v-html='config[option].optionHint')
          img.c-box-img(src='/assets/images/rule-placeholder.png' alt='')

        transition-expand
          div(v-if='option === form.option')
            voting-system-input.c-input(:type='option' :value='form.value' @update='setValue')

      i18n.help You can change this later in your Group Settings.
    slot
</template>

<script>
import { RULE_PERCENTAGE, RULE_DISAGREEMENT } from '@model/contracts/voting/rules.js'
import L, { LTags } from '@view-utils/translations.js'
import TransitionExpand from '@components/TransitionExpand.vue'
import VotingSystemInput from '@components/VotingSystemInput.vue'

export default {
  name: 'GroupRules',
  props: {
    group: { type: Object },
    $v: { type: Object }
  },
  components: {
    TransitionExpand,
    VotingSystemInput
  },
  data: () => ({
    config: {
      [RULE_PERCENTAGE]: {
        optionLabel: L('Percentage based'),
        optionHint: L('Define the percentage of members who will need to {b_}agree{_b} to a proposal.', LTags('b')),
        slideDefault: 75 // TODO connect to store.
      },
      [RULE_DISAGREEMENT]: {
        optionLabel: L('Disagreement number'),
        optionHint: L('Define the maximum number of people who can {b_}disagree{_b} on a proposal', LTags('b')),
        slideLabel: L('Maximum number of “no” votes'),
        slideDefault: 2 // TODO connect to store.
      }
    },
    form: {
      option: null,
      value: null
    }
  }),
  methods: {
    setOption (option) {
      this.form.option = option
      this.form.value = this.config[option].slideDefault
    },
    setValue (value) {
      this.form.value = value
    },
    update (prop, value) {
      this.$v.form[prop].$touch()
      this.$emit('input', {
        data: {
          [prop]: value
        }
      })
    }
  }
}
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
