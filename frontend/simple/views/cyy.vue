<template>
    <span><slot></slot></span>
</template>
<script>
import { symbol } from '../js/currencies'
export default {
  name: 'cyy',
  beforeMount: function () {
    this.$slots.default[0].text = symbol(this.$slots.default[0].text)
  }
}
</script>
