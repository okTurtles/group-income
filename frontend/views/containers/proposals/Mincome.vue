<template lang='pug'>
  proposal-template(
    ref='proposal'
    :title='L("Change minimum income")'
    :disabled='$v.form.$invalid'
    :maxSteps='config.steps.length'
    :currentStep.sync='ephemeral.currentStep'
    @submit='submit'
  )

    label.field(v-if='ephemeral.currentStep === 0' key='0')
      i18n.label New minimum income
      .inputgroup(
        :class='{ error: $v.form.mincomeAmount.$error }'
        v-error:mincomeAmount=''
      )
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
import currencies, { mincomePositive, normalizeCurrency } from '@view-utils/currencies.js'
import L, { LError } from '@view-utils/translations.js'
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
  watch: {
    'ephemeral.currentStep': function (step) {
      if (step === 1) {
        this.validateMincome()
      }
    }
  },
  validations: {
    form: {
      mincomeAmount: {
        [L('This field is required')]: required,
        [L('Oops, you entered 0 or a negative number')]: mincomePositive,
        [L('The amount must be a number. (E.g. 100.75)')]: function (value) {
          return currencies[this.groupSettings.mincomeCurrency].validate(value)
        }
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
    ])
  },
  methods: {
    validateMincome () {
      const mincomeAmount = normalizeCurrency(this.form.mincomeAmount)
      if (mincomeAmount === this.groupSettings.mincomeAmount) {
        this.$refs.formMsg.danger(L('The new mincome should be different than the current one.'))
        this.ephemeral.currentStep = 0
        return false
      }
      this.$refs.formMsg.clean()
      return true
    },
    async submit (form) {
      if (!this.validateMincome()) {
        return
      }

      const mincomeAmount = normalizeCurrency(this.form.mincomeAmount)

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
          this.$refs.formMsg.danger(L('Failed to propose mincome change: {reportError}', LError(e)))
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
        console.error('Mincome.vue submit() error:', e)
        this.$refs.formMsg.danger(L('Failed to change mincome: {reportError}', LError(e)))
      }
    }
  }
}
</script>
<style lang="scss" scoped>
@import "@assets/style/_variables.scss";
</style>
