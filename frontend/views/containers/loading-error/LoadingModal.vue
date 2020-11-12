<template lang='pug'>
  modal-template(class='has-background' ref='modal' :a11yTitle='L("Loading")' :loading='true')
    template(slot='title')
      i18n(tag='h2' class='is-title-2 c-title') Loading...

    .loading-box
</template>

<script>
import ModalTemplate from '@components/modal/ModalTemplate.vue'

export default {
  name: 'LoadingModal',
  components: {
    ModalTemplate
  }
}
</script>

<style lang="scss" scoped>
.c-title {
  padding: 1.5rem 0;
}
</style>
