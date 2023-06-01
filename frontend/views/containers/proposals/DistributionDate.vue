<template lang='pug'>
  proposal-template(
    ref='proposal'
    :title='L("Change distribution date")'
    :disabled='$v.form.$invalid'
    :maxSteps='config.steps.length'
    :currentStep.sync='ephemeral.currentStep'
    variant='changeDistributionDate'
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
      i18n.helper(:args='{currentDistributionDate}') Current distribution date is on {currentDistributionDate}.

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
        distributionDate: null
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
      if (step === 1 && !this.shouldChangeDistributionDateImmediately) {
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
      'groupShouldChangeDistributionDateImmediately',
      'ourUsername',
      'groupShouldPropose',
      'groupSettings',
      'groupMembersCount'
    ]),
    currentDistributionDate () {
      return humanDate(this.groupSettings.distributionDate, { month: 'long', day: 'numeric' })
    },
    shouldChangeDistributionDateImmediately () {
      return !this.groupShouldPropose || this.groupShouldChangeDistributionDateImmediately(this.ourUsername)
    }
  },
  beforeMount () {
    for (let index = 1; index <= 30; index++) {
      this.ephemeral.distributionDayRange.push(dateToPeriodStamp(addTimeToDate(new Date().setUTCHours(0, 0, 0, 0), index * DAYS_MILLIS)))
    }
  },
  mounted () {
    if (!this.groupShouldPropose && this.ourUsername !== this.groupSettings.groupCreator) {
      this.$refs.proposal.close()
      return
    }
    this.$refs.distributionDate.focus()
  },
  methods: {
    humanDate,
    validateDistributionDate () {
      if (this.form.distributionDate === this.groupSettings.distributionDate) {
        this.$refs.formMsg.danger(L('The new distribution date should be different from the current one.'))
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

      if (this.shouldChangeDistributionDateImmediately) {
        try {
          console.log('TODO: Should change distribution date immediately')
          this.$refs.proposal.close()
        } catch (e) {
          console.error('DistributionDate.vue submit() error:', e)
          this.$refs.formMsg.danger(e.message)
        }
        return
      }

      try {
        console.log('TODO: Should create a proposal')
        this.ephemeral.currentStep += 1 // Show Success step
      } catch (e) {
        console.error('DistributionDate.vue submit() error:', e)
        this.$refs.formMsg.danger(e.message)
        this.ephemeral.currentStep = 0
      }
    }
  }
}: Object)
</script>
<style lang="scss" scoped>
@import "@assets/style/_variables.scss";
</style>
