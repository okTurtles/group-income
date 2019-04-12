<template lang='pug'>
  form(
    novalidate
    ref='form'
    name='formData'
    @submit.prevent='login'
  )
    modal-template.is-small
      template(slot='title')
        i18n Login

      .field
        p.control.has-icon
          input#LoginName.input(
            :class="{'is-danger': $v.form.name.$error}"
            name='name'
            v-model='form.name'
            @keyup.enter='login'
            @input='$v.form.name.$touch()'
            placeholder='username'
            ref='username'
            autofocus
            data-test='loginName'
          )
          span.icon
            i.fa.fa-user
        i18n.help.is-danger(
          v-show='$v.form.name.$error'
        ) username cannot contain spaces

      .field
        p.control.has-icon
          form-password(
            :value='form'
            :v='$v.form'
            @enter='login'
            @input='(newPassword) => {password = newPassword}'
          )
          span.icon
            i.fas.fa-lock

        i18n.help.is-danger(
          v-show='$v.form.password.$error'
          data-test='badPassword'
        ) password must be at least 7 characters

      template(slot='buttons')
        button.button.is-primary(
          :disabled='$v.form.$invalid'
          data-test='loginSubmit'
          type='submit'
        )
          span.icon
            i.fa.fa-user
          i18n Login

      template(slot='errors') {{ form.response }}

      template(slot='footer')
        a(@click='showSignUpModal')
          i18n Don't have an account?
</template>

<script>
import { validationMixin } from 'vuelidate'
import sbp from '~/shared/sbp.js'
import { required, minLength } from 'vuelidate/lib/validators'
import { LOAD_MODAL, CLOSE_MODAL } from '@utils/events.js'
import FormPassword from '@components/Forms/Password.vue'
import ModalTemplate from '@components/Modal/ModalTemplate.vue'
import L from '@views/utils/translations.js'

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
      sbp('okTurtles.events/emit', LOAD_MODAL, 'SignUp')
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

<style lang="scss" scoped>
  form {
    position: fixed;
    height: 100%;
    width: 100%;
    z-index: 9998;
  }
</style>
