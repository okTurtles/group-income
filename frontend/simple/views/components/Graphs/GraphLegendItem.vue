<template>
  <li>
    <div class="is-size-7 is-uppercase has-text-grey has-text-weight-normal c-label">
      <span class="c-visual" v-if="color" :class="`has-background-${color}`"></span>
      {{label}}
    </div>
    <span class="is-size-5 has-text-weight-bold">
      <slot></slot>
    </span>
  </li>
</template>
<style lang="scss" scoped>
@import "../../../assets/sass/theme/index";

.c-label {
  line-height: 1;
}

.c-visual {
  display: inline-block;
  width: $gi-spacer-sm;
  height: $gi-spacer-sm;
  margin-right: $gi-spacer-xs;
}
</style>
<script>
export default {
  name: 'GraphLegendItem',
  props: {
    label: {
      type: String,
      required: true
    },
    color: String
  }
}
</script>
