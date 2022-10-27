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

  .c-password-fields-container
    password-form(:label='L("Password")' name='password' :$v='$v')

    password-form(:label='L("Confirm Password")' name='passwordConfirm' :$v='$v')

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
import { email, maxLength, minLength, required, sameAs } from 'vuelidate/lib/validators'
import { validationMixin } from 'vuelidate'
import ModalTemplate from '@components/modal/ModalTemplate.vue'
import PasswordForm from '@containers/access/PasswordForm.vue'
import BannerScoped from '@components/banners/BannerScoped.vue'
import ButtonSubmit from '@components/ButtonSubmit.vue'
import {
  IDENTITY_PASSWORD_MIN_CHARS as passwordMinChars,
  IDENTITY_USERNAME_MAX_CHARS as usernameMaxChars
} from '@model/contracts/shared/constants.js'
import { requestNotificationPermission } from '@model/contracts/shared/nativeNotification.js'
import validationsDebouncedMixins from '@view-utils/validationsDebouncedMixins.js'
import {
  allowedUsernameCharacters,
  noConsecutiveHyphensOrUnderscores,
  noLeadingOrTrailingHyphen,
  noLeadingOrTrailingUnderscore,
  noUppercase,
  noWhitespace
} from '@model/contracts/shared/validators.js'

export default ({
  name: 'SignupForm',
  mixins: [
    validationMixin,
    validationsDebouncedMixins
  ],
  props: {
    // ButtonSubmit component waits until the `click` listener (which is `signup` function) is finished
    // This prop is something we could add to wait for it to be finished in `signup` process
    postSubmit: {
      type: Function,
      default: () => {}
    }
  },
  components: {
    ModalTemplate,
    PasswordForm,
    BannerScoped,
    ButtonSubmit
  },
  data () {
    return {
      form: {
        username: '',
        password: '',
        passwordConfirm: '',
        email: '',
        pictureBase64: ''
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
        await this.postSubmit()
        this.$emit('submit-succeeded')

        requestNotificationPermission()
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
          [L('A username cannot contain whitespace.')]: noWhitespace,
          [L('A username can only contain letters, digits, hyphens or underscores.')]: allowedUsernameCharacters,
          [L('A username cannot exceed {maxChars} characters.', { maxChars: usernameMaxChars })]: maxLength(usernameMaxChars),
          [L('A username cannot contain uppercase letters.')]: noUppercase,
          [L('A username cannot start or end with a hyphen.')]: noLeadingOrTrailingHyphen,
          [L('A username cannot start or end with an underscore.')]: noLeadingOrTrailingUnderscore,
          [L('A username cannot contain two consecutive hyphens or underscores.')]: noConsecutiveHyphensOrUnderscores,
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
          [L('Your password must be at least {minChars} characters long.', { minChars: passwordMinChars })]: minLength(passwordMinChars)
        },
        passwordConfirm: {
          [L('Passwords do not match.')]: sameAs('password')
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

<style lang="scss" scoped>
@import "@assets/style/_variables.scss";

.c-password-fields-container {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  margin-top: 1.5rem;

  @include tablet {
    flex-direction: row;
    align-items: flex-start;
    gap: 1.5rem;
  }
}
</style>
