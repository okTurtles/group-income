<template lang='pug'>
modal-template(
  ref='modal'
  :a11yTitle='L("Chat attachment too large modal")'
)
  template(slot='title')
    span {{ warningMessages.title }}

  .c-content
    span {{ warningMessages.content }}

  .buttons.is-centered
    button.is-primary.c-dismiss-btn(
      type='button'
      @click='$refs.modal.close()'
    )
      i18n OK
</template>

<script>
import ModalTemplate from '@components/modal/ModalTemplate.vue'
import { L } from '@common/common.js'
import { CHAT_ATTACHMENT_SIZE_LIMIT } from '@utils/constants.js'

export default {
  name: 'ChatFileAttachmentWarningModal',
  components: {
    ModalTemplate
  },
  computed: {
    warningMessages () {
      const template = {
        'large': {
          title: L('File too large'),
          // TODO: replace '1 GB' below with a value delivered from the server once implemented.
          content: L('That file is too large and cannot be uploaded. The limit is {sizeLimit} MB', { sizeLimit: CHAT_ATTACHMENT_SIZE_LIMIT })
        },
        'unsupported': {
          title: L('Unsupported file type'),
          content: L('The file you just attached is not supported and cannot be uploaded to the chat.')
        }
      }

      return template[this.$route.query.type]
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
