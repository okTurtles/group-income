<template>
  <ul :class="{'gi-list': hasMargin}">
    <slot></slot>
  </ul>
</template>
<style lang="scss" scoped>
@import "../../../assets/sass/theme/index";

.gi-list {
  margin: $gi-spacer-sm 0;
}

</style>
<script>
export default {
  name: 'List',
  props: {
    hasMargin: Boolean
  }
}
</script>
