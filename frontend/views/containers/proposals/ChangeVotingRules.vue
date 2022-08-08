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
    p.has-text-1.c-desc(v-if='changeSystem' v-safe-html='changeSystem' data-test='changeSystem')

    voting-rules-input.c-input(
      v-if='config.rule'
      :rule='config.rule'
      :value='form.threshold'
      @update='setThreshold'
    )

    // REVIEW - Why disagreement has an explanation but percentage doesn't?
    template(v-if='config.rule === RULE_DISAGREEMENT')
      i18n.has-text-1(v-if='form.threshold > 1' :args='{nr: form.threshold}') Future proposals would be accepted if {nr} or fewer members disagree.
      i18n.has-text-1(v-else :args='LTags("b")') Future proposals would be accepted if {b_}no one{_b} disagrees.

  banner-scoped(ref='formMsg' data-test='proposalError')
</template>

<script>
import sbp from '@sbp/sbp'
import { mapGetters, mapState } from 'vuex'
import { CLOSE_MODAL, SET_MODAL_QUERIES } from '@utils/events.js'
import { L, LTags } from '@common/common.js'
import { proposalDefaults } from '@model/contracts/shared/voting/proposals.js'
import { RULE_PERCENTAGE, RULE_DISAGREEMENT } from '@model/contracts/shared/voting/rules.js'
import { PROPOSAL_PROPOSAL_SETTING_CHANGE } from '@model/contracts/shared/constants.js'
import BannerScoped from '@components/banners/BannerScoped.vue'
import ProposalTemplate from './ProposalTemplate.vue'
import VotingRulesInput from '@components/VotingRulesInput.vue'

export default ({
  name: 'ChangeVotingRules',
  components: {
    BannerScoped,
    ProposalTemplate,
    VotingRulesInput
  },
  data () {
    return {
      RULE_DISAGREEMENT,
      config: {
        steps: ['VotingSystem'],
        rule: null
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
    const rule = this.$route.query.rule

    if (rule) {
      sbp('okTurtles.events/emit', SET_MODAL_QUERIES, 'ChangeVotingRules', { rule })
      this.config.rule = rule
      this.form.threshold = rule === this.proposalSettings.rule
        ? this.currentThreshold
        : proposalDefaults.ruleSettings[rule].threshold
    } else {
      console.warn('RemoveMember: Missing valid query "rule".')
      sbp('okTurtles.events/emit', CLOSE_MODAL)
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
      return this.changeSystem ? null : this.proposalSettings.ruleSettings[this.config.rule].threshold
    },
    title () {
      if (this.proposalSettings.rule === this.config.rule) {
        return L('Change voting rules')
      }
      return L('Change voting system')
    },
    changeSystem () {
      if (this.proposalSettings.rule === this.config.rule) {
        return ''
      }

      const nameMap = {
        [RULE_DISAGREEMENT]: L('disagreement number'),
        [RULE_PERCENTAGE]: L('percentage based')
      }

      return L('Change from a {b_}{oldSystem}{_b} voting system to a {b_}{newSystem}{_b} voting system.', {
        ...LTags('b'),
        oldSystem: nameMap[this.proposalSettings.rule],
        newSystem: nameMap[this.config.rule]
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
    async submit ({ reason }) {
      // reason gets delivered from 'ProposalTemplate.vue'

      if (!this.validateThreshold()) {
        return
      }

      if (this.groupShouldPropose) {
        try {
          await sbp('gi.actions/group/proposal', {
            contractID: this.currentGroupId,
            data: {
              proposalType: PROPOSAL_PROPOSAL_SETTING_CHANGE,
              proposalData: {
                current: {
                  ruleName: this.proposalSettings.rule,
                  ruleThreshold: this.currentThreshold
                },
                ruleName: this.config.rule,
                ruleThreshold: +this.form.threshold,
                reason
              },
              votingRule: this.groupSettings.proposals[PROPOSAL_PROPOSAL_SETTING_CHANGE].rule,
              expires_date_ms: Date.now() + this.groupSettings.proposals[PROPOSAL_PROPOSAL_SETTING_CHANGE].expires_ms
            }
          })
          this.ephemeral.currentStep += 1 // Show Success step
        } catch (e) {
          console.error('ChangeVotingRules.vue failed:', e)
          this.$refs.formMsg.danger(e.message)
          this.ephemeral.currentStep = 0
        }
      } else {
        try {
          await sbp('gi.actions/group/updateAllVotingRules', {
            contractID: this.currentGroupId,
            data: {
              ruleName: this.config.rule,
              ruleThreshold: +this.form.threshold
            }
          })
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
}: Object)
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
