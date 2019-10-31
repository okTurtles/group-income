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
      .input-combo(:class='{ error: $v.form.mincomeAmount.$error }')
        input.input(
          v-model='$v.form.mincomeAmount.$model'
          name='mincomeAmount'
          type='number'
          min='1'
          required
        )
        .suffix {{ inputSuffix }}
      i18n.helper(:args='{groupMincomeFormatted}') Currently {groupMincomeFormatted} monthly.
    p.error(v-if='ephemeral.errorMsg') {{ form.response }}
</template>

<script>
import sbp from '~/shared/sbp.js'
import { validationMixin } from 'vuelidate'
import { required } from 'vuelidate/lib/validators'
import { mapGetters, mapState } from 'vuex'
import currencies from '@view-utils/currencies.js'
import { decimals } from '@view-utils/validators.js'
import ProposalTemplate from './ProposalTemplate.vue'

export default {
  name: 'MincomeProposal',
  components: {
    ProposalTemplate
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
      'groupMincomeFormatted'
    ]),
    inputSuffix () {
      return `${currencies[this.groupSettings.mincomeCurrency].symbol} ${this.groupSettings.mincomeCurrency}`
    },
    rule () {
      const { threshold } = this.groupSettings.proposals['group-setting-change'].ruleSettings.threshold
      return { value: Math.round(this.groupMembersCount * threshold), total: this.groupMembersCount }
    }
  },
  methods: {
    async submit (form) {
      this.ephemeral.errorMsg = null

      if (this.groupShouldPropose) {
        return console.log(
          'TODO: Logic to Propose Mincome.',
          'mincome:', this.form.mincomeAmount,
          'reason:', form.reason
        )
      }

      try {
        const updatedSettings = await sbp(
          'gi.contracts/group/updateSettings/create',
          // to avoid numbers with leading zeros (ex: 01)
          { mincomeAmount: parseInt(this.form.mincomeAmount, 10) },
          this.currentGroupId
        )
        await sbp('backend/publishLogEntry', updatedSettings)
        this.$refs.proposal.close()
      } catch (error) {
        console.error('update mincome failed:', error)
        this.ephemeral.errorMsg = error
      }
    }
  }
}
</script>
<style lang="scss" scoped>
@import "_variables.scss";
.c-info {
  margin-top: $spacer-sm;
}
</style>
