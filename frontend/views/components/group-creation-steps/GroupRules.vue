<template lang='pug'>
.wrapper(data-test='rulesStep')
  i18n.is-title-4.steps-title(tag='h4') 4. Voting System

  .card
    fieldset.c-step
      i18n.has-text-bold(tag='legend') Voting on proposals
      i18n.has-text-1.c-desc(tag='p') Proposals are how the group makes decisions. You can propose for example, to add or remove members, or to change your group’s mincome value.

      .cardBox.isActive.c-box
        .c-box-desc
          .c-box-desc-text
            .has-text-bold {{ config.label }}
            .has-text-1.c-hint(v-safe-html='config.hint')
          img.c-box-img(src='/assets/images/rule-placeholder.png' alt='')

        voting-rules-input.c-input(:rule='group.ruleName' :value='group.ruleThreshold' @update='setThreshold')
    slot
</template>

<script>
import { L } from '@common/common.js'
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
      label: L('Percentage based'),
      hint: L('Define the percentage of members who will need to agree to a proposal.')
    }
  }),
  methods: {
    setThreshold (threshold) {
      this.$v.form.ruleThreshold.$touch()
      this.$emit('input', {
        data: {
          ruleThreshold: threshold
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
  padding: 0.75rem 1rem;
  margin-bottom: 1rem;

  &-desc {
    display: flex;
    align-items: center;
  }

  &-desc-text {
    @include tablet {
      margin-left: 1.85rem;
    }
  }

  &-img {
    max-width: 100%;
    margin-left: 1rem;

    @include phone {
      display: none;
    }
  }
}

.c-hint {
  margin-top: 0.25rem;
}

.c-input {
  margin: 2rem 0 0.5rem;

  @include tablet {
    margin-left: 1.8rem;
    margin-right: 1.8rem;
  }
}
</style>
