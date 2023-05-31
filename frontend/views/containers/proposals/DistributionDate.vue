<template lang='pug'>
  proposal-template(
    ref='proposal'
    :title='L("Change distribution date")'
    :disabled='$v.form.$invalid'
    :maxSteps='config.steps.length'
    :currentStep.sync='ephemeral.currentStep'
    @submit='submit'
  )

    label.field(v-if='ephemeral.currentStep === 0' key='0')
      i18n.label New distribution date
      .inputgroup.selectbox(
        :class='{ error: $v.form.distributionDate.$error }'
        v-error:distributionDate=''
      )
        select.select(
          ref='distributionDate'
          :aria-label='L("Choose your group\'s distribution date")'
          name='distributionDate'
          required
          v-model='$v.form.distributionDate.$model'
        )
          i18n(tag='option' disabled value='') Choose your group's distribution date
          option(
            v-for='(item, index) in ephemeral.distributionDayRange'
            :key='index'
            :value='item'
          ) {{ humanDate(item, { month: 'long', year: 'numeric', day: 'numeric' }) }}
      i18n.helper(:args='{distributionDate: "Not sure"}') Current distribution date is {distributionDate}.

    banner-scoped(ref='formMsg' data-test='proposalError')
</template>

<script>
// import sbp from '@sbp/sbp'
import { validationMixin } from 'vuelidate'
import { required } from 'vuelidate/lib/validators'
import { mapGetters, mapState } from 'vuex'
import { L } from '@common/common.js'
import ProposalTemplate from './ProposalTemplate.vue'
import BannerScoped from '@components/banners/BannerScoped.vue'
import { dateToPeriodStamp, addTimeToDate, DAYS_MILLIS, humanDate } from '@model/contracts/shared/time.js'

export default ({
  name: 'DistributionDateProposal',
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
        distributionDate: dateToPeriodStamp(addTimeToDate(new Date().setUTCHours(0, 0, 0, 0), 3 * DAYS_MILLIS))
      },
      ephemeral: {
        distributionDayRange: [],
        errorMsg: null,
        currentStep: 0
      },
      config: {
        steps: [
          'GroupDistributionDate'
        ]
      }
    }
  },
  watch: {
    'ephemeral.currentStep': function (step) {
      if (step === 1 && this.groupShouldPropose) {
        this.validateDistributionDate()
      }
    }
  },
  validations: {
    form: {
      distributionDate: {
        required
      }
    },
    // validation groups by route name for steps
    steps: {
      GroupDistributionDate: [
        'form.distributionDate'
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
      'groupMembersCount'
    ])
  },
  beforeMount () {
    for (let index = 1; index <= 30; index++) {
      this.ephemeral.distributionDayRange.push(dateToPeriodStamp(addTimeToDate(new Date().setUTCHours(0, 0, 0, 0), index * DAYS_MILLIS)))
    }
  },
  mounted () {
    this.$refs.distributionDate.focus()
  },
  methods: {
    humanDate,
    validateDistributionDate () {
      if (this.form.distributionDate === this.groupSettings.distributionDate) {
        this.$refs.formMsg.danger(L('The new distribution date should be different than the current one.'))
        this.ephemeral.currentStep = 0
        return false
      }
      this.$refs.formMsg.clean()
      return true
    },
    submit (form) {
      if (!this.validateDistributionDate()) {
        return
      }

      console.log('TODO')
    }
  }
}: Object)
</script>
<style lang="scss" scoped>
@import "@assets/style/_variables.scss";
</style>
