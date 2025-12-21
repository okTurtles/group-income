<template lang='pug'>
modal-template.is-prompt(
  ref='modal'
  :a11yTitle='L("Login error")'
)
  template(slot='title')
    i18n Login error

  .c-container
    .c-prompt-content.label(v-safe-html:a='contentMessage')

  .buttons
    i18n.is-outlined(tag='button' type='button' @click.stop='refresh') Refresh

  i18n.c-logout-msg(:args='{ sp_: `<span class="link">`, _sp: "</span>"}' ) If refreshing doesn't work, trying {sp_}logging out{_sp}.
</template>

<script>
import sbp from '@sbp/sbp'
import { L, LTags } from '@common/common.js'
import ModalTemplate from '@components/modal/ModalTemplate.vue'

export default {
  name: 'LoginErrorModal',
  components: {
    ModalTemplate
  },
  props: {
    errorMessage: String,
    errorState: Object
  },
  computed: {
    contentMessage () {
      return this.errorMessage
        ? L('An error occurred while logging in. Please try logging in again. {br_}Error details: {err}.', { err: this.errorMessage, ...LTags() })
        : L('An error occurred while logging in. Please try logging in again.')
    }
  },
  methods: {
    refresh () {
      window.location.reload()
    },
    logout () {
      this.$refs.modal.close()
      sbp('gi.app/identity/_private/logout', this.errorState)
    }
  }
}
</script>

<style lang="scss" scoped>
@import "@assets/style/_variables.scss";

.c-container {
  position: relative;
  width: 100%;
  text-align: center;
}

::v-deep .c-modal-header {
  max-width: 37rem;
  align-self: center;
  text-align: center;

  h1 {
    padding: 1.2rem 0;
  }
}
</style>
