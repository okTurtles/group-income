<template>
  <section class="section c-dashboard-section">
    <h3 class="title" v-if="title"><i18n>{{title}}</i18n></h3>
    <slot></slot>
  </section>
</template>
<style lang="scss" scoped>
@import "../../assets/sass/theme/index";

.c-dashboard-section {
  position: relative;
  margin-bottom: $gi-spacer-lg*2;

  &:first-of-type {
    margin-top: $gi-spacer-lg;
  }

  @include tablet {
    margin-bottom: $gi-spacer-lg*3;
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
