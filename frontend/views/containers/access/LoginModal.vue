<template lang='pug'>
  modal-template(class='has-background' ref='modal' :a11yTitle='L("Log in")')
    template(slot='title')
      i18n Log in

    login-form(@submit-succeeded='submit')

    template(slot='footer')
      p
        i18n Not on Group Income yet?
        | &nbsp;
        i18n.link(tag='button' @click='showSignupModal' data-test='goToSignup') Create an account
</template>

<script>
import sbp from '~/shared/sbp.js'
import { REPLACE_MODAL } from '@utils/events.js'
import LoginForm from '@containers/access/LoginForm.vue'
import ModalTemplate from '@components/modal/ModalTemplate.vue'

export default ({
  name: 'LoginModal',
  components: {
    ModalTemplate,
    LoginForm
  },
  methods: {
    submit () {
      this.$refs.modal.close()
      this.$router.push({ path: '/dashboard' }).catch(() => {})
    },
    showSignupModal () {
      sbp('okTurtles.events/emit', REPLACE_MODAL, 'SignupModal')
    }
  }
}: Object)
</script>
