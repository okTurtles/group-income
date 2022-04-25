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
        i18n In what day should the first payment distribution be calculated?
        tooltip(direction='bottom-end')
          span.button.is-icon-small
            i.icon-question-circle
          template(slot='tooltip')
            i18n(tag='p') Select which day of the month should the distribution be calculated. Every group member will need to update their mincome details before this date to ensure that the algorythm can fairly distribute available funds between group members.

      .selectbox
        select.select(
          :aria-label='L("Choose day")'
          name='distributionDate'
          required=''
          :value='group.distributionDate.toString()'
          @change='update'
        )
          i18n(tag='option' disabled value='') Choose day
          option(
            v-for='(item, index) in ephemeral.distributionDayRange'
            :key='index'
            :value='item'
          ) {{ new Date(item).getDate() }}

      i18n.helper Payment distribution will be calculated every 30 days.
    slot
</template>

<script>
import currencies from '@view-utils/currencies.js'
import Tooltip from '@components/Tooltip.vue'
import { dateToPeriodStamp, addTimeToDate, DAYS_MILLIS } from '~/frontend/utils/time.js'

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
    for (let index = 0; index < 30; index++) {
      this.ephemeral.distributionDayRange.push(dateToPeriodStamp(addTimeToDate(new Date().setUTCHours(0, 0, 0, 0), index * DAYS_MILLIS)))
    }
  },
  mounted () {
    this.$refs.mincome.focus()
  },
  methods: {
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
