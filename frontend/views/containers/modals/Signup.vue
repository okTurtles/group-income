<template lang='pug'>
  modal-template(class='has-background' ref='modal')
    template(slot='title')
      i18n Sign Up

    form-signup(@submitSucceeded='submit')

    template(slot='footer')
      p
        i18n Already have an account?
        | &nbsp;
        i18n.link(tag='a' @click='showLoginModal' data-test='goToLogin') Log in
</template>

<script>
import { REPLACE_MODAL } from '@utils/events.js'
import sbp from '~/shared/sbp.js'
import ModalTemplate from '@components/Modal/ModalTemplate.vue'
import FormSignup from '@containers/forms/FormSignup.vue'

export default {
  name: 'Signup',
  components: {
    ModalTemplate,
    FormSignup
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
