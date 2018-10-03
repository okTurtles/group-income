<template>
  <label class="gi-fieldGroup">
    <p class="label">{{label}}</p>
    <strong class="help has-text-danger has-text-weight-normal gi-help" v-if="error">{{error}}</strong>
    <div class="field has-addons">
      <span class="control">
        <span class="button is-static">
          {{groupCurrency}}
        </span>
      </span>
      <span class="control">
        <slot></slot>
      </span>
    </div>
    <p class="is-size-6 gi-help" v-if="$slots.help">
      <slot name="help"></slot>
    </p>
  </label>
</template>
<style lang="scss" scoped>
.input {
  width: 6rem;
}
</style>
<script>
export default {
  name: 'InputField',
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
