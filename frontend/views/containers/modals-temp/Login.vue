<template lang='pug'>
  modal-template(class='has-background-footer')
    template(slot='title')
      i18n Log in

    form(
      novalidate
      ref='form'
      name='formData'
      data-test='login'
      @submit.prevent='login'
    )
      .field
        label.label
          i18n Username

        input#loginName.input(
          :class="{'error': $v.form.name.$error}"
          name='name'
          v-model='form.name'
          @keyup.enter='login'
          @input='$v.form.name.$touch()'
          placeholder='username'
          ref='username'
          autofocus
          data-test='loginName'
        )
        p.error(
          v-show='$v.form.name.$error'
        )
          i18n username cannot contain spaces

      form-password(
        :label='L("Password")'
        :value='form'
        :v='$v.form'
        @enter='login'
        @input='(newPassword) => {password = newPassword}'
      )

      a.link(@click='forgotPassword')
        i18n Forgot your password?

      p.error(v-if='form.response') {{ form.response }}

      .buttons.is-centered
        button(
          :disabled='$v.form.$invalid'
          data-test='loginSubmit'
          type='submit'
        )
          i18n Login

    template(slot='footer')
      p
        i18n Not on Group Income yet?&nbsp;
        a.link(@click='showSignUpModal')
          i18n Create an account
</template>

<script>
import { validationMixin } from 'vuelidate'
import sbp from '~/shared/sbp.js'
import { required, minLength } from 'vuelidate/lib/validators'
import { REPLACE_MODAL, CLOSE_MODAL } from '@utils/events.js'
import FormPassword from '@components/Forms/Password.vue'
import ModalTemplate from '@components/Modal/ModalTemplate.vue'
import L from '@view-utils/translations.js'

export default {
  name: 'LoginModal',
  mixins: [ validationMixin ],
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
        const identityContractId = await sbp('namespace/lookup', this.form.name)
        console.log(`Retrieved identity ${identityContractId}`)
        await this.$store.dispatch('login', { name: this.form.name, identityContractId })
        this.close()
        this.$router.push({ path: '/' })
      } catch (error) {
        this.form.response = L('Invalid username or password')
        console.error(error)
      }
    },
    close () {
      sbp('okTurtles.events/emit', CLOSE_MODAL)
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
        password: null,
        response: null
      }
    }
  },
  validations: {
    form: {
      name: {
        required,
        nonWhitespace: value => /^\S+$/.test(value)
      },
      password: {
        required,
        minLength: minLength(7)
      }
    }
  }
}
</script>
