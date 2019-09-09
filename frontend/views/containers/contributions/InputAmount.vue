<template lang='pug'>
label.gi-fieldGroup
  p.label {{label}}

  span.help.has-text-danger.gi-help(v-if='error') {{error}}

  .field.has-addons
    span.control
      span.button.is-static
        | {{groupCurrency}}
    span.control
      input.input(
        type='number'
        :class='{ error }'
        v-bind='$attrs'
        v-on='$listeners'
      )

  p.is-size-6.gi-help(v-if='$slots.help')
    slot(name='help')
</template>

<script>
export default {
  name: 'InputAmount',
  props: {
    label: String,
    error: String
  },
  inheritAttrs: false,
  computed: {
    groupCurrency () {
      return '$ USD'
    }
  }
}
</script>

<style lang="scss" scoped>
.input {
  width: 6rem;
}
</style>
