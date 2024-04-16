<template lang='pug'>
modal-template(
  ref='modal'
  :a11yTitle='L("Chat attachment too large modal")'
)
  template(slot='title')
    i18n File too large

  .c-content
    i18n(:args='{ sizeLimit: config.sizeLimit }') That file is too large and cannot be uploaded. The limit is {sizeLimit} MB

  .buttons.is-centered
    button.is-primary.c-dismiss-btn(
      type='button'
      @click='$refs.modal.close()'
    )
      i18n OK
</template>

<script>
import ModalTemplate from '@components/modal/ModalTemplate.vue'
import { CHAT_ATTACHMENT_SIZE_LIMIT } from '@utils/constants.js'

export default {
  name: 'ChatFileAttachmentWarningModal',
  components: {
    ModalTemplate
  },
  data () {
    return {
      config: {
        sizeLimit: CHAT_ATTACHMENT_SIZE_LIMIT
      }
    }
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
