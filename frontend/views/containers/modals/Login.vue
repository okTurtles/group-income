<template lang='pug'>
  modal-template(class='has-background' ref='modal')
    template(slot='title')
      i18n Log in

    form(
      novalidate
      ref='form'
      name='formData'
      data-test='login'
      @submit.prevent='login'
    )
      label.field
        i18n.label Username
        input.input#loginName(
          :class='{error: $v.form.name.$error}'
          name='name'
          v-model='$v.form.name.$model'
          @keyup.enter='login'
          ref='username'
          autofocus
          data-test='loginName'
          v-error:name='{ attrs: { "data-test": "badUsername" } }'
        )

      form-password(
        :label='L("Password")'
        :value='form'
        :v='$v.form'
        @enter='login'
        @input='(newPassword) => {password = newPassword}'
      )

      i18n.link(tag='a' @click='forgotPassword') Forgot your password?

      p.error(v-if='ephemeral.errorMsg' data-test='loginError') {{ ephemeral.errorMsg }}

      .buttons.is-centered
        i18n(
          tag='button'
          :disabled='$v.form.$invalid'
          data-test='loginSubmit'
          type='submit'
        ) Login

    template(slot='footer')
      p
        i18n Not on Group Income yet?&nbsp;
        i18n.link(
          data-test='goToSignup'
          tag='a'
          @click='showSignUpModal'
        ) Create an account
</template>

<script>
import { validationMixin } from 'vuelidate'
import sbp from '~/shared/sbp.js'
import { required, minLength } from 'vuelidate/lib/validators'
import { REPLACE_MODAL } from '@utils/events.js'
import FormPassword from '@components/Forms/Password.vue'
import ModalTemplate from '@components/Modal/ModalTemplate.vue'
import L from '@view-utils/translations.js'

export default {
  name: 'LoginModal',
  mixins: [validationMixin],
  components: {
    ModalTemplate,
    FormPassword
  },
  inserted () {
    this.$refs.username.focus()
  },
  methods: {
    async login () {
      try {
        // TODO: Insert cryptography here
        const identityContractID = await sbp('namespace/lookup', this.form.name)
        console.log(`Retrieved identity ${identityContractID}`)
        await sbp('state/vuex/dispatch', 'login', {
          username: this.form.name,
          identityContractID
        })
        this.close()
        if (this.$store.state.currentGroupId) this.$router.push({ path: '/dashboard' })
      } catch (error) {
        this.ephemeral.errorMsg = L('Invalid username or password')
        console.error(error)
      }
    },
    close () {
      this.$refs.modal.close()
    },
    showSignUpModal () {
      sbp('okTurtles.events/emit', REPLACE_MODAL, 'SignUp')
    },
    forgotPassword () {
      // TODO: implement forgot password
      console.log('Coming soon')
    }
  },
  data () {
    return {
      form: {
        name: null,
        password: null
      },
      ephemeral: {
        errorMsg: null
      }
    }
  },
  validations: {
    form: {
      name: {
        required,
        [L('Username cannot contain spaces')]: value => /^\S+$/.test(value)
      },
      password: {
        required,
        minLength: minLength(7)
      }
    }
  }
}
</script>
