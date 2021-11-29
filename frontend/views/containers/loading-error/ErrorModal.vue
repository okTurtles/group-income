<template lang='pug'>
  modal-template(class='has-background' ref='modal' :a11yTitle='L("Loading")')
    template(slot='title')
      i18n(tag='h2' class='is-title-2 c-title' v-if='type===500') 500
      i18n(tag='h2' class='is-title-2 c-title' v-else) 404

    .c-wrapper(v-if='type===500')
      i18n.is-title-3.c-title(tag='h2') Server error
      i18n.c-text(tag='p') We are having some trouble. Please try again later.

    .c-wrapper(v-else)
      i18n.is-title-3.c-title(tag='h2') Page not found
      i18n.c-text(tag='p') We couldn’t find what you are looking for.
      router-link.button(to='/')
        i18n Take me home
</template>

<script>
import ModalTemplate from '@components/modal/ModalTemplate.vue'

export default ({
  name: 'LoadingModal',
  components: {
    ModalTemplate
  },
  props: {
    type: {
      type: Number,
      default: 500
    }
  }
}: Object)
</script>

<style lang="scss" scoped>
.c-title {
  padding: 1.5rem 0;
}

.c-wrapper {
  text-align: center;
}
</style>
