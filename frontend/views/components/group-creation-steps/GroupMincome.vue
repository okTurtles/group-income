<template lang='pug'>
.wrapper
  i18n.is-title-4.steps-title(tag='h4') 3. Minimum Income

  .card
    fieldset
      i18n.label What is the minimum each member should receive monthly?
      .selectgroup
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
          :class='{ error: $v.form.mincomeAmount.$error }'
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

    i18n.has-text-1 This value can be adjusted in the future.

    slot
</template>

<script>
import currencies from '@view-utils/currencies.js'

export default {
  name: 'GroupMincome',
  props: {
    group: { type: Object },
    $v: { type: Object }
  },
  data () {
    return {
      currencies
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
}
</script>
