<template lang='pug'>
.wrapper
  i18n.is-title-4.steps-title(tag='h4') 3. Minimum Income

  .card
    fieldset.field
      i18n.label What is the minimum monthly income this group is trying to ensure for its members?
      .selectgroup(
        :class='{ error: $v.form.mincomeAmount.$error }'
        v-error:mincomeAmount=''
      )
        input.input(
          ref='mincome'
          inputmode='decimal'
          pattern='[0-9]*'
          placeholder='Amount'
          :aria-label='L("Amount")'
          name='mincomeAmount'
          step='1'
          min='0'
          required=''
          :value='group.mincomeAmount'
          @input='update'
          @keyup.enter='next'
        )
        select.select(
          :aria-label='L("Currency")'
          name='mincomeCurrency'
          required=''
          :value='group.mincomeCurrency'
          @input='update'
        )
          option(
            v-for='(currency, code) in currencies'
            :value='code'
            :key='code'
          ) {{ currency.symbolWithCode }}

      i18n.helper This value can be adjusted in the future.

    fieldset.field
      .label.c-label-tooltip
        i18n On what day should the first payment distribution be calculated?
        tooltip(direction='bottom-end')
          span.button.is-icon-small
            i.icon-question-circle
          template(slot='tooltip')
            i18n(tag='p') Select which day of the month the distribution should be calculated. Every group member will need to update their mincome details before this date to ensure that the algorithm can fairly distribute available funds between group members.

      .selectbox
        select.select(
          :aria-label='L("Choose your group\'s distribution date")'
          name='distributionDate'
          required=''
          :value='group.distributionDate'
          @change='update'
        )
          i18n(tag='option' disabled value='') Choose your group's distribution date
          option(
            v-for='(item, index) in ephemeral.distributionDayRange'
            :key='index'
            :value='item'
          ) {{ humanDate(item, { month: 'long', year: 'numeric', day: 'numeric' }) }}

      i18n.helper Payment distribution will be calculated every 30 days.
    slot
</template>

<script>
import currencies from '@view-utils/currencies.js'
import Tooltip from '@components/Tooltip.vue'
import { dateToPeriodStamp, addTimeToDate, DAYS_MILLIS, humanDate } from '~/frontend/utils/time.js'

export default ({
  name: 'GroupMincome',
  components: {
    Tooltip
  },
  props: {
    group: { type: Object },
    $v: { type: Object }
  },
  data () {
    return {
      currencies,
      ephemeral: {
        distributionDayRange: []
      }
    }
  },
  beforeMount () {
    for (let index = 1; index <= 30; index++) {
      this.ephemeral.distributionDayRange.push(dateToPeriodStamp(addTimeToDate(new Date().setUTCHours(0, 0, 0, 0), index * DAYS_MILLIS)))
    }
  },
  mounted () {
    this.$refs.mincome.focus()
  },
  methods: {
    humanDate,
    update (e) {
      this.$v.form[e.target.name].$touch()
      this.$emit('input', {
        data: {
          [e.target.name]: e.target.value
        }
      })
    },
    next (e) {
      this.$v.form[e.target.name].$touch()
      if (!this.$v.form[e.target.name].$invalid) {
        this.$emit('next')
      }
    }
  }
}: Object)
</script>

<style lang="scss" scoped>
.c-label-tooltip {
  display: flex;
  justify-content: space-between;
}
</style>
