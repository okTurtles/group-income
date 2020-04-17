<template lang='pug'>
  modal-template(class='has-background' ref='modal' :a11yTitle='L("Sign up")')
    template(slot='title')
      i18n Sign Up

    signup-form(@submitSucceeded='submit')

    template(slot='footer')
      p
        i18n Already have an account?
        | &nbsp;
        i18n.link(tag='button' @click='showLoginModal' data-test='goToLogin') Log in
</template>

<script>
import { REPLACE_MODAL } from '@utils/events.js'
import sbp from '~/shared/sbp.js'
import ModalTemplate from '@components/modal/ModalTemplate.vue'
import SignupForm from '@containers/access/SignupForm.vue'

export default {
  name: 'Signup',
  components: {
    ModalTemplate,
    SignupForm
  },
  methods: {
    submit () {
      if (this.$route.query.next) {
        // TODO: get rid of this timeout and fix/update tests accordingly
        setTimeout(() => {
          this.$router.push({ path: this.$route.query.next })
        }, 1000)
      } else {
        this.$router.push({ path: '/' })
      }
      this.$refs.modal.close()
    },
    showLoginModal () {
      sbp('okTurtles.events/emit', REPLACE_MODAL, 'LoginModal')
    }
  }
}
</script>
