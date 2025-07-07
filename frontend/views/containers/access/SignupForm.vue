<template lang='pug'>
form(data-test='signup' @submit.prevent='')
  label.field
    i18n.label Username
    input.input(
      :class='{error: $v.form.username.$error}'
      autocapitalize='off'
      name='username'
      ref='username'
      v-model.trim='form.username'
      @input='debounceField("username")'
      @blur='updateField("username")'
      data-test='signName'
      v-error:username='{ attrs: { "data-test": "badUsername" } }'
    )

  .c-password-fields-container
    password-form(:label='L("Password")' name='password' :$v='$v')

    password-form(:label='L("Confirm Password")' name='passwordConfirm' :$v='$v')

  .c-auto-password-field-container
    password-form(
      mode='auto'
      :label='L("This is your password. Save it now.")'
      name='password'
      :$v='$v'
    )

  label.checkbox
    input.input(
      type='checkbox'
      name='terms'
      v-model='form.terms'
      data-test='signTerms'
      @click.stop=''
    )
    i18n(
      :args='{ a_: `<a class="link" target="_blank" href="${linkToTerms}">`, _a: "</a>"}'
    ) I agree to the {a_}terms and conditions{_a}

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
import { maxLength, minLength, required, sameAs } from 'vuelidate/lib/validators'
import { validationMixin } from 'vuelidate'
import PasswordForm from '@containers/access/PasswordForm.vue'
import BannerScoped from '@components/banners/BannerScoped.vue'
import ButtonSubmit from '@components/ButtonSubmit.vue'
import {
  IDENTITY_PASSWORD_MIN_CHARS as passwordMinChars,
  IDENTITY_USERNAME_MAX_CHARS as usernameMaxChars
} from '@model/contracts/shared/constants.js'
import { requestNotificationPermission } from '@model/notifications/nativeNotification.js'
import validationsDebouncedMixins from '@view-utils/validationsDebouncedMixins.js'
import {
  allowedUsernameCharacters,
  noConsecutiveHyphensOrUnderscores,
  noLeadingOrTrailingHyphen,
  noLeadingOrTrailingUnderscore,
  noUppercase,
  noWhitespace
} from '@model/contracts/shared/validators.js'
import { Secret } from '@chelonia/lib/Secret'
import ALLOWED_URLS from '@view-utils/allowedUrls.js'

export const usernameValidations = {
  [L('A username is required.')]: required,
  [L('A username cannot contain whitespace.')]: noWhitespace,
  [L('A username can only contain letters, digits, hyphens or underscores.')]: allowedUsernameCharacters,
  [L('A username cannot exceed {maxChars} characters.', { maxChars: usernameMaxChars })]: maxLength(usernameMaxChars),
  [L('A username cannot contain uppercase letters.')]: noUppercase,
  [L('A username cannot start or end with a hyphen.')]: noLeadingOrTrailingHyphen,
  [L('A username cannot start or end with an underscore.')]: noLeadingOrTrailingUnderscore,
  [L('A username cannot contain two consecutive hyphens or underscores.')]: noConsecutiveHyphensOrUnderscores
}

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
    PasswordForm,
    BannerScoped,
    ButtonSubmit
  },
  mounted () {
    // NOTE: nextTick is needed because debounceField is called once after the form is mounted
    this.$nextTick(() => {
      this.$refs.username.focus()
    })
  },
  data () {
    return {
      form: {
        username: '',
        password: '',
        passwordConfirm: '',
        terms: false,
        pictureBase64: ''
      },
      linkToTerms: ALLOWED_URLS.TERMS_PAGE,
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
        this.$emit('signup-status', 'submitting')
        await sbp('gi.app/identity/signupAndLogin', {
          username: this.form.username,
          password: new Secret(this.form.password)
        })
        await this.postSubmit()
        this.$emit('signup-status', 'success')
        // Request notification permissions now (within short time window of user action:
        // https://github.com/whatwg/notifications/issues/108 )
        requestNotificationPermission({ enableIfGranted: true })
      } catch (e) {
        console.error('Signup.vue submit() error:', e)
        this.$refs.formMsg?.danger(e.message)
        this.$emit('signup-status', 'error')
      }
    }
  },
  // we use dynamic validation schema to support accessing this.usernameAsyncValidation
  // https://vuelidate.js.org/#sub-dynamic-validation-schema
  validations () {
    return {
      form: {
        username: {
          ...usernameValidations,
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
                  resolve(!await sbp('namespace/lookup', value, { skipCache: true }))
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
        terms: {
          [L('You need to agree to the terms and conditions.')]: (value) => {
            return Boolean(value)
          }
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

  @include phone {
    margin-bottom: 1.5rem;
  }
}

.c-auto-password-field-container {
  margin: 1.5rem 0;
}
</style>
