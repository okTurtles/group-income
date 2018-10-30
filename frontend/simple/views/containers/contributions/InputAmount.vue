<template>
  <label class="gi-fieldGroup">
    <p class="label">{{label}}</p>
    <span class="help has-text-danger gi-help" v-if="error">{{error}}</span>
    <div class="field has-addons">
      <span class="control">
        <span class="button is-static">
          {{groupCurrency}}
        </span>
      </span>
      <span class="control">
        <input class="input"
          :class="{'is-danger': error }"
          type="number"
          v-bind="$attrs"
          v-on="$listeners"
        >
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
