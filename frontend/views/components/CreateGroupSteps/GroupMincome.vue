<template lang='pug'>
div
  i18n.steps-title(tag='p') 3. Minimum Income

  i18n.label(tag='label') What is the minimum each individual in your group should receive monthly?

  .select-wrapper
    input.input(
      ref='mincome'
      type='number'
      placeholder='Amount'
      name='incomeProvided'
      step='1'
      min='0'
      required=''
      :class='{ error: v.incomeProvided.$error }'
      :value='group.incomeProvided'
      @input='update'
      @keyup.enter='next'
    )

    select(
      name='incomeCurrency'
      required=''
      :value='group.incomeCurrency'
      @input='update'
    )
      option(
        v-for='(symbol, code) in currencies'
        :value='code'
        :key='code'
      ) {{ symbol }}

  i18n.has-text-1(tag='p') This value can be adjusted in the future.
</template>

<script>
import currencies from '../../utils/currencies.js'

export default {
  name: 'GroupMincome',
  props: {
    group: { type: Object },
    v: { type: Object }
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
      this.v[e.target.name].$touch()
      this.$emit('input', {
        data: {
          [e.target.name]: e.target.value
        }
      })
    },
    next (e) {
      this.v[e.target.name].$touch()
      if (!this.v[e.target.name].$invalid) {
        this.$emit('next')
      }
    }
  }
}
</script>
