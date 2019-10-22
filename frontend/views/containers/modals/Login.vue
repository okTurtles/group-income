<template lang='pug'>
  modal-template(class='has-background' ref='modal')
    template(slot='title')
      i18n Log in

    form-login(@submitSucceeded='submit')

    template(slot='footer')
      p
        i18n Not on Group Income yet?
        i18n.link(
          data-test='goToSignup'
          tag='a'
          @click='showSignupModal'
        ) Create an account
</template>

<script>
import sbp from '~/shared/sbp.js'
import { REPLACE_MODAL } from '@utils/events.js'
import FormLogin from '@containers/forms/FormLogin.vue'
import ModalTemplate from '@components/Modal/ModalTemplate.vue'

export default {
  name: 'LoginModal',
  components: {
    ModalTemplate,
    FormLogin
  },
  methods: {
    submit () {
      this.$refs.modal.close()
      if (this.$store.state.currentGroupId) this.$router.push({ path: '/dashboard' })
    },
    showSignupModal () {
      sbp('okTurtles.events/emit', REPLACE_MODAL, 'Signup')
    }
  }
}
</script>
