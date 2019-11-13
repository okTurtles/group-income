<template lang='pug'>
.wrapper
  i18n.steps-title(tag='h4') 3. Minimum Income

  .card
    i18n.label(tag='label') What is the minimum each member should receive monthly?

    .select-wrapper
      input.input(
        ref='mincome'
        type='number'
        placeholder='Amount'
        name='mincomeAmount'
        step='1'
        min='0'
        required=''
        :class='{ error: vForm.mincomeAmount.$error }'
        :value='group.mincomeAmount'
        @input='update'
        @keyup.enter='next'
      )

      select(
        name='mincomeCurrency'
        required=''
        :value='group.mincomeCurrency'
        @input='update'
      )
        option(
          v-for='(currency, code) in currencies'
          :value='code'
          :key='code'
        ) {{ currency.symbol }}

    i18n.has-text-1(tag='p') This value can be adjusted in the future.

    slot
</template>

<script>
import currencies from '@view-utils/currencies.js'

export default {
  name: 'GroupMincome',
  props: {
    group: { type: Object },
    vForm: { type: Object }
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
      this.vForm[e.target.name].$touch()
      this.$emit('input', {
        data: {
          [e.target.name]: e.target.value
        }
      })
    },
    next (e) {
      this.vForm[e.target.name].$touch()
      if (!this.vForm[e.target.name].$invalid) {
        this.$emit('next')
      }
    }
  }
}
</script>
