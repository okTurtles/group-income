<template lang='pug'>
.wrapper(data-test='rulesStep')
  i18n.is-title-4.steps-title(tag='h4') 4. Voting System

  .card.c-card
    fieldset.c-step
      i18n.has-text-bold(tag='legend') Voting on proposals
      i18n.has-text-1.c-desc(tag='p') Proposals are how the group makes decisions. You can propose for example, to add or remove members, or to change your group’s mincome value.

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

.c-card {
  padding: 1.5rem 1rem 2.5rem;

  @include tablet {
    padding: 1.5rem 1.5rem 2.5rem;
  }

  @include desktop {
    padding: 2.5rem;
  }
}

.c-step {
  margin-bottom: 2rem;
}

.c-desc {
  margin-top: 0.25rem;
  margin-bottom: 1.5rem;
}
</style>
