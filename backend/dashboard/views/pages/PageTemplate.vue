<template lang="pug">
.c-page
  header.c-page-header(v-if='!noHeader')
    slot(name='header')
    h2.is-title-2(v-if='$slots.title')
      slot(name='title')

  main.c-page-main
    slot
</template>

<script>
export default {
  name: 'PageTemplate',
  props: {
    noHeader: {
      type: Boolean,
      default: false
    }
  }
}
</script>

<style lang="scss" scoped>
@import "@assets/style/_variables.scss";

.c-page {
  padding: 1.75rem 1rem;
  width: 100%;

  @include tablet {
    padding: 1.75rem 2rem;
  }

  &-main {
    max-width: 96rem;
  }
}

.c-page-header {
  margin-bottom: 2rem;
  padding-right: 1rem;
}
</style>
