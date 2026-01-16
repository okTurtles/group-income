<template lang='pug'>
modal-template.is-prompt(
  :a11yTitle='L("Login error")'
  modalName='LoginErrorModal'
  ref='modal'
)
  template(slot='title')
    i18n Login error

  .c-container
    .c-prompt-content(v-safe-html:a='contentMessage')

    .buttons.is-centered.c-buttons
      i18n.is-outlined(tag='button' type='button' @click.stop='refresh') Refresh

    i18n.c-logout-msg(:args='{ btn_: `<button class="link" type="button">`, _btn: "</button>"}' @click='onLogoutMsgClick') If refreshing doesn't work, try {btn_}logging out{_btn}.
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
      const { origin, pathname } = window.location
      // Reload page but without ?modal=LoginErrorModal in the url query string.
      window.location.href = `${origin}${pathname}`
    },
    onLogoutMsgClick (e) {
      if (e.target.closest('button.link')) {
        sbp('gi.app/identity/logout') 
        this.$refs.modal.close()
      }
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

::v-deep header.c-modal-header {
  width: 100%;
  align-items: center;
  text-align: center;
}

.c-buttons {
  margin-top: 1.5rem;
}

.c-logout-msg {
  display: block;
  margin-top: 0.75rem;
  color: $text_1;
}
</style>
