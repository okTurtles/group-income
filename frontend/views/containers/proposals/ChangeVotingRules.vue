<template lang='pug'>
proposal-template(
  ref='proposal'
  :title='title'
  :disabled='false'
  :maxSteps='config.steps.length'
  :currentStep.sync='ephemeral.currentStep'
  @submit='submit'
)
  .c-step(v-if='ephemeral.currentStep === 0' key='0')
    p.has-text-1.c-desc(v-if='changeSystem' v-html='changeSystem' data-test='changeSystem')

    voting-rules-input.c-input(
      v-if='rule'
      :rule='rule'
      :value='form.threshold'
      @update='setThreshold'
    )

    // REVIEW - Why disagreement has an explanation but percentage doesn't?
    template(v-if='rule === RULE_DISAGREEMENT')
      i18n.has-text-1(v-if='form.threshold > 1' :args='{nr: form.threshold}') Future proposals would be accepted if {nr} or fewer members disagree.
      i18n.has-text-1(v-else :args='LTags("b")') Future proposals would be accepted if {b_}no one{_b} disagrees.

  banner-scoped(ref='formMsg' data-test='proposalError')
</template>

<script>
import sbp from '~/shared/sbp.js'
import { mapGetters, mapState } from 'vuex'
import { CLOSE_MODAL } from '@utils/events.js'
import L, { LTags } from '@view-utils/translations.js'
import { proposalDefaults } from '@model/contracts/voting/proposals.js'
import { RULE_PERCENTAGE, RULE_DISAGREEMENT } from '@model/contracts/voting/rules.js'
import { PROPOSAL_PROPOSAL_SETTING_CHANGE } from '@model/contracts/voting/constants.js'
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
      validator: (value) => [RULE_DISAGREEMENT, RULE_PERCENTAGE].includes(value)
      // default: RULE_DISAGREEMENT // TODO this. Related to #935
    }
  },
  data () {
    return {
      RULE_DISAGREEMENT,
      config: {
        steps: ['VotingSystem']
      },
      form: {
        threshold: null,
        reason: ''
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
      this.form.threshold = this.rule === this.proposalSettings.rule
        ? this.currentThreshold
        : proposalDefaults.ruleSettings[this.rule].threshold
    }
  },
  watch: {
    'ephemeral.currentStep': function (step) {
      // Validate threshold when reaching step 1
      if (this.groupShouldPropose && step === 1) {
        this.validateThreshold()
      }
    }
  },
  computed: {
    ...mapState([
      'currentGroupId'
    ]),
    ...mapGetters([
      'groupShouldPropose',
      'groupProposalSettings',
      'groupSettings'
    ]),
    proposalSettings () {
      return this.groupProposalSettings()
    },
    currentThreshold () {
      // Only check currentThreshold if the system is the same.
      return this.changeSystem ? null : this.proposalSettings.ruleSettings[this.rule].threshold
    },
    title () {
      if (this.proposalSettings.rule === this.rule) {
        return L('Change voting rules')
      }
      return L('Change voting system')
    },
    changeSystem () {
      if (this.proposalSettings.rule === this.rule) {
        return ''
      }

      const nameMap = {
        [RULE_DISAGREEMENT]: L('disagreement number'),
        [RULE_PERCENTAGE]: L('percentage based')
      }

      return L('Change from a {b_}{oldSystem}{_b} voting system to a {b_}{newSystem}{_b} voting system.', {
        ...LTags('b'),
        oldSystem: nameMap[this.proposalSettings.rule],
        newSystem: nameMap[this.rule]
      })
    }
  },
  methods: {
    setThreshold (value) {
      this.form.threshold = value
    },
    validateThreshold () {
      if (+this.form.threshold === this.currentThreshold) {
        this.ephemeral.currentStep = 0
        this.$refs.formMsg.danger(L('You are proposing to keep the same value as the actual.'))
        return false
      }
      this.$refs.formMsg.clean()
      return true
    },
    async submit () {
      if (!this.validateThreshold()) {
        return
      }

      if (this.groupShouldPropose) {
        try {
          const proposal = await sbp('gi.contracts/group/proposal/create',
            {
              proposalType: PROPOSAL_PROPOSAL_SETTING_CHANGE,
              proposalData: {
                current: {
                  ruleName: this.proposalSettings.rule,
                  ruleThreshold: this.currentThreshold
                },
                ruleName: this.rule,
                ruleThreshold: +this.form.threshold,
                reason: this.form.reason
              },
              votingRule: this.groupSettings.proposals[PROPOSAL_PROPOSAL_SETTING_CHANGE].rule,
              expires_date_ms: Date.now() + this.groupSettings.proposals[PROPOSAL_PROPOSAL_SETTING_CHANGE].expires_ms
            },
            this.currentGroupId
          )
          await sbp('backend/publishLogEntry', proposal)
          this.ephemeral.currentStep += 1 // Show Success step
        } catch (e) {
          console.error('ChangeVotingRules.vue failed:', e)
          this.$refs.formMsg.danger(e.message)
          this.ephemeral.currentStep = 0
        }
      } else {
        try {
          await sbp('gi.actions/group/updateVotingRules', {
            ruleName: this.rule,
            ruleThreshold: +this.form.threshold
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
        'form.threshold'
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
