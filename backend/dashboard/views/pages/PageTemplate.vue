<template lang="pug">
.c-page
  header.c-page-header
    slot(name='header')
    h2.is-title-2(v-if='$slots.title')
      slot(name='title')

  main.c-page-main
    slot
</template>

<script>
export default {
  name: 'PageTemplate'
}
</script>

<style lang="scss" scoped>
@import "@assets/style/_variables.scss";

.c-page {
  padding: 1.75rem 1rem;
  width: 100%;
  max-width: 96rem;

  @include tablet {
    padding: 1.75rem 2rem;
  }
}

.c-page-header {
  margin-bottom: 2rem;
}
</style>
