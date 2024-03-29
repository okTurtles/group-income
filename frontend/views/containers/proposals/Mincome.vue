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
          ref='mincomeAmount'
          inputmode='decimal'
          pattern='[0-9]*'
        )
        .suffix {{ groupMincomeSymbolWithCode }}
      i18n.helper(:args='{groupMincomeFormatted}') Currently {groupMincomeFormatted} monthly.

    banner-scoped(ref='formMsg' data-test='proposalError')
</template>

<script>
import sbp from '@sbp/sbp'
import { validationMixin } from 'vuelidate'
import { required } from 'vuelidate/lib/validators'
import { mapGetters, mapState } from 'vuex'
import currencies, { mincomePositive, normalizeCurrency } from '@model/contracts/shared/currencies.js'
import { L } from '@common/common.js'
import ProposalTemplate from './ProposalTemplate.vue'
import BannerScoped from '@components/banners/BannerScoped.vue'
import { PROPOSAL_GROUP_SETTING_CHANGE } from '@model/contracts/shared/constants.js'

export default ({
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
      if (step === 1 && this.groupShouldPropose) {
        this.validateMincome()
      }
    }
  },
  validations: {
    form: {
      mincomeAmount: {
        [L('This field is required')]: required,
        [L('The amount must be a number. (E.g. 100.75)')]: function (value) {
          return currencies[this.groupSettings.mincomeCurrency].validate(value)
        },
        [L('Mincome must be greater than 0')]: mincomePositive
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
  mounted () {
    this.$refs.mincomeAmount.focus()
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
          await sbp('gi.actions/group/proposal', {
            contractID: this.currentGroupId,
            data: {
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
            }
          })
          this.ephemeral.currentStep += 1 // Show Success step
        } catch (e) {
          this.$refs.formMsg.danger(e.message)
          this.ephemeral.currentStep = 0
        }
        return
      }

      try {
        await sbp('gi.actions/group/updateSettings', {
          contractID: this.currentGroupId, data: { mincomeAmount }
        })
        this.$refs.proposal.close()
      } catch (e) {
        console.error('Mincome.vue submit() error:', e)
        this.$refs.formMsg.danger(e.message)
      }
    }
  }
}: Object)
</script>
<style lang="scss" scoped>
@import "@assets/style/_variables.scss";
</style>
