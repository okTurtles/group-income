<template>
  <fieldset class="c-fieldset">
    <legend class="has-text-centered has-text-grey c-legend">{{legend}}</legend>

    <p class="control">
      <input ref="input" class="input is-large" type="text" :value="value.amount" :placeholder="L('amount')">
    </p>

    <p class="control">
      <input ref="input" class="input is-large" type="text" :value="value.address" :placeholder="L('address')">
    </p>
  </fieldset>
  </div>
</template>
<style lang="scss" scoped>
@import "../../../../../assets/sass/theme/index";

.c-fieldset {
  border: none;
}

.c-legend {
  margin: $gi-spacer 0 $gi-spacer-lg;
}
</style>
<script>
export default {
  name: 'BitcoinPayment',
  props: {
    legend: String,
    value: Object,
    groupCurrency: String
  }
}
</script>
