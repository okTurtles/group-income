<template lang='pug'>
  proposal-template(
    ref='proposal'
    :title='L("Change minimum income")'
    :rule='rule'
    :disabled='$v.form.$invalid'
    :maxSteps='config.steps.length'
    :currentStep.sync='ephemeral.currentStep'
    @submit='submit'
  )

    label.field(v-if='ephemeral.currentStep === 0' key='0')
      i18n.label New minimum income
      .inputgroup(:class='{ error: $v.form.mincomeAmount.$error }')
        input.input(
          v-model='$v.form.mincomeAmount.$model'
          name='mincomeAmount'
          inputmode='decimal'
          pattern='[0-9]*'
        )
        .suffix {{ groupMincomeSymbolWithCode }}
      i18n.helper(:args='{groupMincomeFormatted}') Currently {groupMincomeFormatted} monthly.

    banner-scoped(ref='formMsg' data-test='proposalError')
</template>

<script>
import sbp from '~/shared/sbp.js'
import { validationMixin } from 'vuelidate'
import { required } from 'vuelidate/lib/validators'
import { mapGetters, mapState } from 'vuex'
import { decimals } from '@view-utils/validators.js'
import L from '@view-utils/translations.js'
import ProposalTemplate from './ProposalTemplate.vue'
import BannerScoped from '@components/banners/BannerScoped.vue'
import { PROPOSAL_GROUP_SETTING_CHANGE } from '@model/contracts/voting/constants.js'

export default {
  name: 'MincomeProposal',
  components: {
    ProposalTemplate,
    BannerScoped
  },
  mixins: [
    validationMixin
  ],
  data () {
    return {
      form: {
        mincomeAmount: null
      },
      ephemeral: {
        errorMsg: null,
        currentStep: 0
      },
      config: {
        steps: [
          'GroupMincome'
        ]
      }
    }
  },
  validations: {
    form: {
      mincomeAmount: {
        required,
        minValue: value => value > 0,
        decimals: decimals(2)
      }
    },
    // validation groups by route name for steps
    steps: {
      GroupMincome: [
        'form.mincomeAmount'
      ]
    }
  },
  computed: {
    ...mapState([
      'currentGroupId'
    ]),
    ...mapGetters([
      'groupShouldPropose',
      'groupSettings',
      'groupMembersCount',
      'groupMincomeFormatted',
      'groupMincomeSymbolWithCode'
    ]),
    rule () {
      const proposalRule = this.groupSettings.proposals[PROPOSAL_GROUP_SETTING_CHANGE]
      const { threshold } = proposalRule.ruleSettings[proposalRule.rule]
      return { value: Math.round(this.groupMembersCount * threshold), total: this.groupMembersCount }
    }
  },
  methods: {
    async submit (form) {
      const mincomeAmount = parseInt(this.form.mincomeAmount, 10)
      this.$refs.formMsg.clean()

      if (this.groupShouldPropose) {
        try {
          const proposal = await sbp('gi.contracts/group/proposal/create',
            {
              proposalType: PROPOSAL_GROUP_SETTING_CHANGE,
              proposalData: {
                setting: 'mincomeAmount',
                proposedValue: mincomeAmount,
                currentValue: this.groupSettings.mincomeAmount,
                mincomeCurrency: this.groupSettings.mincomeCurrency,
                reason: form.reason
              },
              votingRule: this.groupSettings.proposals[PROPOSAL_GROUP_SETTING_CHANGE].rule,
              expires_date_ms: Date.now() + this.groupSettings.proposals[PROPOSAL_GROUP_SETTING_CHANGE].expires_ms
            },
            this.currentGroupId
          )
          await sbp('backend/publishLogEntry', proposal)

          this.ephemeral.currentStep += 1 // Show Success step
        } catch (e) {
          console.error(`Failed to change mincome to ${mincomeAmount}`, e.message)
          this.$refs.formMsg.danger(L('Failed to change mincome. {codeError}', { codeError: e.message }))
          this.ephemeral.currentStep = 0
        }
        return
      }

      try {
        const updatedSettings = await sbp(
          'gi.contracts/group/updateSettings/create',
          { mincomeAmount },
          this.currentGroupId
        )
        await sbp('backend/publishLogEntry', updatedSettings)
        this.$refs.proposal.close()
      } catch (e) {
        console.error(`Failed to change mincome to ${mincomeAmount}`, e.message)
        this.$refs.formMsg.danger(L('Failed to change mincome {codeError}', { codeError: e.message }))
      }
    }
  }
}
</script>
<style lang="scss" scoped>
@import "@assets/style/_variables.scss";
</style>
