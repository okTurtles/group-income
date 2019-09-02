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
        i18n.label(tag='label') Username

        input.input#loginName(
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
        i18n.error(
          v-show='$v.form.name.$error'
          tag='p'
        ) Username cannot contain spaces

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
          tag='a'
          @click='showSignUpModal'
        ) Create an account
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
