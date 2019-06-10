<template lang="pug">
div
  p.steps-title
    | 3.&nbsp;
    i18n  Minimum Income

  label.label
    i18n What is the minimum each individual in your group should receive monthly?

  .select-wrapper
    input.input(
      ref='mincome'
      type='number'
      placeholder='Amount'
      name='incomeProvided'
      step='1'
      min='0'
      required=''
      :class="{ 'error': v.incomeProvided.$error }"
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

  p.has-text-light This value can be adjusted in the future.
</template>

<script>
import currencies from '../../utils/currencies'

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
