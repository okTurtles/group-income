<template lang='pug'>
  modal-template(
    class='has-background'
    ref='modal'
    :a11yTitle='L("Log in")'
    modalName='LoginModal'
    :loading='ephemeral.isLoggingIn'
  )
    template(slot='title')
      i18n Log in

    login-form(@login-status='onLoginStatusChange')

    template(slot='footer')
      p
        i18n Not on Group Income yet?
        | &nbsp;
        i18n.link(tag='button' @click='showSignupModal' data-test='goToSignup') Create an account
</template>

<script>
import sbp from '@sbp/sbp'
import { REPLACE_MODAL } from '@utils/events.js'
import LoginForm from '@containers/access/LoginForm.vue'
import ModalTemplate from '@components/modal/ModalTemplate.vue'

export default ({
  name: 'LoginModal',
  components: {
    ModalTemplate,
    LoginForm
  },
  data () {
    return {
      ephemeral: {
        isLoggingIn: false
      }
    }
  },
  methods: {
    onPostSubmit () {
      this.$refs.modal.close()
      this.$router.push({ query: this.$route.query, path: this.$route.query.next ?? '/' }).catch(() => {})
    },
    onLoginStatusChange (status) {
      switch (status) {
        case 'submitting':
          this.ephemeral.isLoggingIn = true
          break
        case 'success': {
          this.ephemeral.isLoggingIn = false
          this.$nextTick(this.onPostSubmit)
          break
        }
        default: // 'error' status
          this.ephemeral.isLoggingIn = false
      }
    },
    showSignupModal () {
      sbp('okTurtles.events/emit', REPLACE_MODAL, 'SignupModal')
    }
  }
}: Object)
</script>
