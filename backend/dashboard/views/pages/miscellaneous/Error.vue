<template lang="pug">
page-template(:noHeader='true')
  .c-404-text
    i.icon-info.c-404-icon
    i18n.is-title-1.c-404-heading(tag='h1') 404 Not found
    i18n.has-text-color-1(tag='p') Could not find the resource or page
</template>

<script>
import PageTemplate from '../PageTemplate.vue'

export default {
  name: 'Error',
  components: {
    PageTemplate
  }
}
</script>

<style lang="scss" scoped>
@import "@assets/style/_variables.scss";

.c-404-text {
  position: absolute;
  top: 50%;
  left: 50%;
  padding: 2rem 1rem;
  transform: translate(-50%, -60%);
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
