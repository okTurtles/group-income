<template lang='pug'>
modal-template(
  ref='modal'
  :a11yTitle='L("Chat attachment too large modal")'
)
  template(slot='title')
    i18n File too large

  .c-content
    i18n That file is too large and cannot be uploaded. The limit is 1 GB.

  .buttons.is-centered
    button.is-primary.c-dismiss-btn(
      type='button'
      @click='$refs.modal.close()'
    )
      i18n Ok
</template>

<script>
import ModalTemplate from '@components/modal/ModalTemplate.vue'

export default {
  name: 'ChatFileTooLargeModal',
  components: {
    ModalTemplate
  }
}
</script>

<style lang="scss" scoped>
.c-content {
  margin-bottom: 1rem;
}

.c-dismiss-btn {
  min-width: 9.6875rem;
}
</style>
