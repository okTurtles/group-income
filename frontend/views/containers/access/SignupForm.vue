<template lang='pug'>
form(data-test='signup' @submit.prevent='')
  label.field
    i18n.label Username
    input.input(
      :class='{error: $v.form.username.$error}'
      name='username'
      v-model.trim='form.username'
      @input='debounceField("username")'
      @blur='updateField("username")'
      data-test='signName'
      v-error:username='{ attrs: { "data-test": "badUsername" } }'
    )

  label.field
    i18n.label Email
    input.input(
      :class='{error: $v.form.email.$error}'
      name='email'
      type='email'
      v-model.trim='form.email'
      @input='debounceField("email")'
      @blur='updateField("email")'
      data-test='signEmail'
      v-error:email='{ attrs: { "data-test": "badEmail" } }'
    )

  password-form(:label='L("Password")' name='password' :$v='$v')

  banner-scoped(ref='formMsg' allow-a)

  .buttons.is-centered
    button-submit(
      @click='signup'
      data-test='signSubmit'
      :disabled='$v.form.$invalid'
    ) {{ L('Create an account') }}
</template>

<script>
import sbp from '@sbp/sbp'
import { L } from '@common/common.js'
import { required, minLength, email } from 'vuelidate/lib/validators'
import { validationMixin } from 'vuelidate'
import { nonWhitespace } from '@views/utils/validators.js'
import ModalTemplate from '@components/modal/ModalTemplate.vue'
import PasswordForm from '@containers/access/PasswordForm.vue'
import BannerScoped from '@components/banners/BannerScoped.vue'
import ButtonSubmit from '@components/ButtonSubmit.vue'
import validationsDebouncedMixins from '@view-utils/validationsDebouncedMixins.js'
import { noUppercase } from '@view-utils/validators.js'

export default ({
  name: 'SignupForm',
  mixins: [
    validationMixin,
    validationsDebouncedMixins
  ],
  components: {
    ModalTemplate,
    PasswordForm,
    BannerScoped,
    ButtonSubmit
  },
  data () {
    return {
      form: {
        username: null,
        password: null,
        email: null,
        pictureBase64: null
      },
      usernameAsyncValidation: {
        timer: null,
        resolveFn: null
      }
    }
  },
  methods: {
    async signup () {
      if (this.$v.form.$invalid) {
        this.$refs.formMsg.danger(L('The form is invalid.'))
        return
      }
      try {
        await sbp('gi.actions/identity/signupAndLogin', {
          username: this.form.username,
          email: this.form.email,
          password: this.form.password
        })
        this.$emit('submit-succeeded')
      } catch (e) {
        console.error('Signup.vue submit() error:', e)
        this.$refs.formMsg.danger(e.message)
      }
    }
  },
  // we use dynamic validation schema to support accessing this.usernameAsyncValidation
  // https://vuelidate.js.org/#sub-dynamic-validation-schema
  validations () {
    return {
      form: {
        username: {
          [L('A username is required.')]: required,
          [L('A username cannot contain spaces.')]: nonWhitespace,
          [L('A username cannot contain uppercase letters.')]: noUppercase,
          [L('This username is already being used.')]: (value) => {
            if (!value) return true
            if (this.usernameAsyncValidation.timer) {
              clearTimeout(this.usernameAsyncValidation.timer)
            }
            if (this.usernameAsyncValidation.resolveFn) {
              this.usernameAsyncValidation.resolveFn(true)
              this.usernameAsyncValidation.resolveFn = null
            }
            return new Promise((resolve) => {
              this.usernameAsyncValidation.resolveFn = resolve
              this.usernameAsyncValidation.timer = setTimeout(async () => {
                try {
                  resolve(!await sbp('namespace/lookup', value))
                } catch (e) {
                  console.warn('unexpected exception in SignupForm validation:', e)
                  resolve(true)
                }
              }, 1000)
            })
          }
        },
        password: {
          [L('A password is required.')]: required,
          [L('Your password must be at least 7 characteres long.')]: minLength(7)
        },
        email: {
          [L('An email is required.')]: required,
          [L('Please enter a valid email.')]: email
        }
      }
    }
  }
}: Object)
</script>
