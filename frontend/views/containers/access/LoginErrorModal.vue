<template lang='pug'>
modal-template.is-prompt(
  ref='modal'
  :a11yTitle='L("Login error")'
)
  template(slot='title')
    i18n Login error

  .c-container
    .c-prompt-content(v-safe-html:a='contentMessage')

    .buttons.is-centered.c-buttons
      i18n.is-outlined(tag='button' type='button' @click.stop='refresh') Refresh

    i18n.c-logout-msg(:args='{ sp_: `<span class="link">`, _sp: "</span>"}' @click='onLogoutMsgClick') If refreshing doesn't work, try {sp_}logging out{_sp}.
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
    onLogoutMsgClick (e) {
      if (e.target.matches('span.link')) {
        this.$refs.modal.close()
        sbp('gi.app/identity/_private/logout', this.errorState)
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
