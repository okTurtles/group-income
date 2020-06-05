<template lang='pug'>
proposal-template(
  ref='proposal'
  :title='title'
  :rule='{ value: 8, total: 10 }'
  :disabled='false'
  :maxSteps='config.steps.length'
  :currentStep.sync='ephemeral.currentStep'
  @submit='submit'
)
  .c-step
    p.has-text-1.c-desc(v-if='changeSystem' v-html='changeSystem' data-test='changeSystem')

    voting-rules-input.c-input(
      :rule='rule'
      :value='form.value'
      @update='setValue'
    )

    template(v-if='rule === RULE_DISAGREEMENT')
      i18n.has-text-1(v-if='form.value > 1' :args='{nr: form.value}') Future proposals would be accepted if {nr} or fewer members disagree.
      i18n.has-text-1(v-else :args='LTags("b")') Future proposals would be accepted if {b_}no one{_b} disagrees.

  banner-scoped(ref='formMsg' data-test='proposalError')
</template>

<script>
import sbp from '~/shared/sbp.js'
import { mapGetters, mapState } from 'vuex'
import { CLOSE_MODAL } from '@utils/events.js'
import L, { LTags } from '@view-utils/translations.js'
import { RULE_PERCENTAGE, RULE_DISAGREEMENT } from '@model/contracts/voting/rules.js'
import BannerScoped from '@components/banners/BannerScoped.vue'
import ProposalTemplate from './ProposalTemplate.vue'
import VotingRulesInput from '@components/VotingRulesInput.vue'

export default {
  name: 'ChangeVotingRules',
  components: {
    BannerScoped,
    ProposalTemplate,
    VotingRulesInput
  },
  props: {
    rule: {
      type: String,
      validator: (value) => [RULE_DISAGREEMENT, RULE_PERCENTAGE].includes(value),
      default: RULE_DISAGREEMENT
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
    if (!this.rule) {
      sbp('okTurtles.events/emit', CLOSE_MODAL)
    } else {
      this.form.value = this.groupVotingRule.ruleSettings[this.rule].threshold
    }
  },
  computed: {
    ...mapState([
      'currentGroupId'
    ]),
    ...mapGetters([
      'groupShouldPropose',
      'groupVotingRule'
    ]),
    title () {
      if (this.groupVotingRule.rule === this.rule) {
        return L('Change voting rules')
      }
      return L('Change voting system')
    },
    changeSystem () {
      if (this.groupVotingRule.rule === this.rule) {
        return ''
      }

      const nameMap = {
        [RULE_DISAGREEMENT]: L('disagreement number'),
        [RULE_PERCENTAGE]: L('percentage based')
      }

      return L('Change from a {b_}{oldSystem}{_b} voting system to a {b_}{newSystem}{_b} voting system.', {
        ...LTags('b'),
        oldSystem: nameMap[this.groupVotingRule.rule],
        newSystem: nameMap[this.rule]
      })
    }
  },
  methods: {
    setValue (value) {
      this.form.value = value
    },
    async submit () {
      if (this.groupShouldPropose) {
        alert('TODO proposal')
      } else {
        try {
          await sbp('gi.actions/group/updateVotingRules', {
            ruleName: this.rule,
            ruleThreshold: +this.form.value
          }, this.currentGroupId)

          this.$refs.proposal.close()
        } catch (e) {
          console.error('ChangeVotingRules.vue failed:', e)
          this.$refs.formMsg.danger(e.message)
        }
      }
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

.c-step,
.c-desc {
  margin-bottom: 2rem;
}

.c-input {
  margin-bottom: 1rem;
}
</style>
