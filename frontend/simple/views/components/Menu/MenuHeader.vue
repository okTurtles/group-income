<template>
  <div class="c-header has-text-info has-text-weight-bold is-size-7 is-uppercase">
      <slot></slot>
  </div>
</template>
<style lang="scss" scoped>
@import "../../../assets/sass/theme/index";

.c-header {
  padding: $gi-spacer $gi-spacer-sm 0;
}
</style>
<script>
export default {
  name: 'MenuHeader'
}
</script>
