<template lang='pug'>
.p-wrapper(v-if='type===500')
  h1.is-title-1.p-title 500
  i18n.is-title-3.c-title(tag='h2') Server error
  i18n.c-text(tag='p') We are having some trouble. Please try again later.

.p-wrapper(v-else)
  h1.is-title-1.p-title 404
  i18n.is-title-3.c-title(tag='h2') Page not found
  i18n.c-text(tag='p') We couldn’t find what you are looking for.
  router-link.button(to='/')
    i18n Take me home
</template>

<script>
export default {
  name: 'ErrorPage',
  props: {
    type: {
      type: Number,
      default: 500
    }
  }
}
</script>

<style lang="scss" scoped>
@import "@assets/style/_variables.scss";

.p-wrapper {
  display: flex;
  flex-direction: column;
  text-align: center;
  justify-content: center;
}

.c-title {
  margin-bottom: .5rem;
}

.c-text {
  color: $text_1;

  & + .button {
    align-self: center;
    margin-top: 2rem;
  }
}
</style>
