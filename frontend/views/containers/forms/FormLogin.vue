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
      @input='e => debounceField(e, "name")'
      @blur='e => updateField(e, "name")'
      autofocus
      data-test='loginName'
      v-error:name='{ attrs: { "data-test": "badUsername" } }'
    )

  form-password(
    :label='L("Password")'
    :vForm='$v.form'
    :error='L("Your password must be at least 7 characters long.")'
    @input='e => debounceField(e, "password")'
    @blur='e => updateField(e, "password")'
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
</template>

<script>
import sbp from '~/shared/sbp.js'
import { validationMixin } from 'vuelidate'
import { required, minLength } from 'vuelidate/lib/validators'
import { nonWhitespace } from '@views/utils/validators.js'
import { debounce } from '@utils/giLodash.js'
import FormPassword from '@containers/forms/FormPassword.vue'
import L from '@view-utils/translations.js'

export default {
  name: 'FormLogin',
  mixins: [validationMixin],
  components: {
    FormPassword
  },
  inserted () {
    this.$refs.username.focus()
  },
  methods: {
    debounceField: debounce(function (e, fieldName) {
      this.updateField(e, fieldName)
    }, 500),
    updateField (e, fieldName) {
      this.form[fieldName] = e.target.value
      this.$v.form[fieldName].$touch()
    },
    async login () {
      try {
        // TODO: Insert cryptography here
        const identityContractID = await sbp('namespace/lookup', this.form.name)
        if (!identityContractID) {
          this.ephemeral.errorMsg = L('Invalid username or password')
          return
        }
        console.debug(`Retrieved identity ${identityContractID}`)
        await sbp('state/vuex/dispatch', 'login', {
          username: this.form.name,
          identityContractID
        })
        this.$emit('submitSucceeded')
      } catch (error) {
        this.ephemeral.errorMsg = error.message
        console.error(error)
      }
    },
    forgotPassword () {
      // TODO: implement forgot password
      alert(L('Coming soon'))
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
        [L('A username is required.')]: required,
        [L('A username cannot contain spaces.')]: nonWhitespace
      },
      password: {
        [L('A password is required.')]: required,
        minLength: minLength(7)
      }
    }
  }
}
</script>
