<template lang='pug'>
proposal-template(
  :title='title'
  :rule='{ value: 8, total: 10 }'
  :disabled='false'
  :maxSteps='config.steps.length'
  :currentStep.sync='ephemeral.currentStep'
  @submit='submit'
)
  .c-step
    voting-system-input.c-input(
      :type='type'
      :value='form.value'
      @update='setValue'
    )

    template(v-if='type === RULE_DISAGREEMENT')
      // TODO review this copy on Figma
      i18n.has-text-1.has-text-small(v-if='form.value > 1' :args='{nr: form.value}') Future proposals would be accepted if {nr} or fewer members disagree.
      i18n.has-text-1.has-text-small(v-else :args='LTags("b")') Future proposals would be accepted if {b_}no one{_b} disagrees.
</template>

<script>
import sbp from '~/shared/sbp.js'
import { CLOSE_MODAL } from '@utils/events.js'
import L from '@view-utils/translations.js'
import { RULE_PERCENTAGE, RULE_DISAGREEMENT } from '@model/contracts/voting/rules.js'
import ProposalTemplate from './ProposalTemplate.vue'
import VotingSystemInput from '@components/VotingSystemInput.vue'

export default {
  name: 'ChangeVotingProposal',
  components: {
    ProposalTemplate,
    VotingSystemInput
  },
  props: {
    type: {
      type: String,
      validator: (value) => [RULE_PERCENTAGE, RULE_DISAGREEMENT].includes(value)
    }
  },
  data () {
    return {
      RULE_DISAGREEMENT,
      config: {
        steps: ['VotingSystem']
      },
      form: {
        value: null,
        changeReason: null
      },
      ephemeral: {
        errorMsg: null,
        currentStep: 0
      }
    }
  },
  created () {
    if (!this.type) {
      sbp('okTurtles.events/emit', CLOSE_MODAL)
    } else {
      this.form.value = this.type === RULE_PERCENTAGE ? 75 : 2 // TODO this.
    }
  },
  computed: {
    title () {
      return L('Change voting [xxxx]') // TODO this
    }
  },
  methods: {
    setValue (value) {
      this.form.value = value
    },
    submit () {
      alert('TODO change on a next PR')
    }
  },
  validations: {
    form: {},
    steps: {
      VotingSystem: [
        'form.value'
      ]
    }
  }
}
</script>

<style lang="scss" scoped>
@import "@assets/style/_variables.scss";

.c-step {
  margin-bottom: 2rem;
}

.c-input {
  margin-bottom: 1rem;
}
</style>
