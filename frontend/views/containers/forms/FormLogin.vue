<template lang='pug'>
form(
  novalidate
  ref='form'
  name='formData'
  data-test='login'
  @submit.prevent='login'
)
  label.field
    i18n.label Username
    input.input(
      :class='{error: $v.form.name.$error}'
      name='name'
      v-model='form.name'
      @input='debounceField("name")'
      @blur='updateField("name")'
      data-test='loginName'
      v-error:name='{ attrs: { "data-test": "badUsername" } }'
      autofocus
    )

  form-password(:label='L("Password")' name='password' :$v='$v')

  i18n.link(tag='a' @click='forgotPassword') Forgot your password?

  feedback-banner(data-test='loginError' v-bind.sync='form.submitFeedback')

  .buttons.is-centered
    i18n(
      tag='button'
      :disabled='$v.form.$invalid'
      data-test='loginSubmit'
      type='submit'
    ) Login
</template>

<script>
import sbp from '~/shared/sbp.js'
import { validationMixin } from 'vuelidate'
import { required } from 'vuelidate/lib/validators'
import { nonWhitespace } from '@views/utils/validators.js'
import FormPassword from '@containers/forms/FormPassword.vue'
import L from '@view-utils/translations.js'
import validationsDebouncedMixins from '@view-utils/validationsDebouncedMixins.js'
import FeedbackBanner from '@components/FeedbackBanner.vue'

export default {
  name: 'FormLogin',
  mixins: [
    validationMixin,
    validationsDebouncedMixins
  ],
  components: {
    FormPassword,
    FeedbackBanner
  },
  data () {
    return {
      form: {
        name: null,
        password: null,
        submitFeedback: {}
      }
    }
  },
  inserted () {
    this.$refs.username.focus()
  },
  methods: {
    async login () {
      try {
        // TODO: Insert cryptography here
        const identityContractID = await sbp('namespace/lookup', this.form.name)
        if (!identityContractID) {
          this.$set(this.form, 'submitFeedback', {
            message: L('Invalid username or password'),
            severity: 'danger'
          })
          return
        }
        console.debug(`Retrieved identity ${identityContractID}`)
        await sbp('state/vuex/dispatch', 'login', {
          username: this.form.name,
          identityContractID
        })
        this.$emit('submitSucceeded')
      } catch (error) {
        console.error(error)
        this.$set(this.form, 'submitFeedback', {
          message: `${L('Something went wrong, please try again.')} ${error.message}`,
          severity: 'danger'
        })
      }
    },
    forgotPassword () {
      // TODO: implement forgot password
      alert(L('Coming soon'))
    }
  },
  validations: {
    form: {
      name: {
        [L('A username is required.')]: required,
        [L('A username cannot contain spaces.')]: nonWhitespace
      },
      password: {
        [L('A password is required.')]: required
      }
    }
  }
}
</script>
