<template lang='pug'>
  modal-template(class='has-background' ref='modal' :a11yTitle='L("Sign up")')
    template(slot='title')
      i18n Sign Up

    signup-form(@submit-succeeded='submit')

    template(slot='footer')
      p
        i18n Already have an account?
        | &nbsp;
        i18n.link(tag='button' @click='showLoginModal' data-test='goToLogin') Log in
</template>

<script>
import sbp from '@sbp/sbp'
import { REPLACE_MODAL } from '@utils/events.js'
import ModalTemplate from '@components/modal/ModalTemplate.vue'
import SignupForm from '@containers/access/SignupForm.vue'
import { logExceptNavigationDuplicated } from '@view-utils/misc.js'

export default ({
  name: 'Signup',
  components: {
    ModalTemplate,
    SignupForm
  },
  methods: {
    submit () {
      this.$router.push({ query: this.$route.query, path: this.$route.query.next ?? '/' }).catch(logExceptNavigationDuplicated)
      this.$refs.modal.close()
    },
    showLoginModal () {
      sbp('okTurtles.events/emit', REPLACE_MODAL, 'LoginModal')
    }
  }
}: Object)
</script>
