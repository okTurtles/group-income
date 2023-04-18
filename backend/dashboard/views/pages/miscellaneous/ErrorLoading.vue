<template lang="pug">
PageTemplate(:noHeader='true')
  .c-404-text
    i.icon-info.c-404-icon
    i18n.is-title-1.c-404-heading(tag='h1') Error loading page
    i18n.has-text-color-1(tag='p') Either our servers are having problems or your connection is down.
</template>

<script>
import PageTemplate from '../PageTemplate.vue'

export default {
  name: 'ErrorLoading',
  components: {
    PageTemplate
  }
}
</script>

<style lang="scss" scoped>
@import "@assets/style/_variables.scss";

.c-404-text {
  position: absolute;
  top: 40%;
  left: 50%;
  padding: 2rem 1.25rem;
  transform: translate(-50%, -60%);
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
}

.c-404-heading {
  margin-bottom: 0.75rem;

  @include tablet {
    font-size: 2.75rem;
  }
}

.c-404-icon {
  display: inline-flex;
  font-weight: 600;
  font-size: 5rem;
  color: $danger;
  opacity: 0.675;
  margin-bottom: 1.25rem;
}
</style>
