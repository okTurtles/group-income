<template>
  <fieldset class="c-fieldset">
    <legend class="has-text-centered has-text-grey c-legend">{{legend}}</legend>

    <div class="field has-addons c-field">
      <p class="control">
        <span class="button is-static is-large">{{groupCurrency}}</span>
      </p>
      <p class="control">
        <input ref="input" class="input is-large" type="number" :value="value" :placeholder="L('amout')">
      </p>
    </div>
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

.c-field {
  justify-content: center;

  .is-large {
    height: 100%; // REVIEW - force align btn & input - Bulma bug
  }

  .input {
    width: 7rem;
  }
}
</style>
<script>
export default {
  name: 'ManualPayment',
  props: {
    legend: String,
    value: Number,
    groupCurrency: String
  }
}
</script>
