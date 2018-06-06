<template>
  <section class="gi-section">
    <h3 class="title"><i18n>{{title}}</i18n></h3>
    <slot></slot>
  </section>
</template>
<style lang="scss" scoped>
@import "../../assets/sass/theme/index";

.gi-section {
  position: relative;
  margin: $gi-spacer-lg*3 0;

  &:first-of-type {
    margin-top: $gi-spacer-lg;
  }
}
</style>
<script>
export default {
  name: 'DashboardSection',
  props: {
    title: String
  }
}
</script>
