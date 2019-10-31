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
    input.input#loginName(
      :class='{error: $v.form.name.$error}'
      name='name'
      @keyup.enter='login'
      @input='debounceName'
      ref='username'
      autofocus
      data-test='loginName'
      v-error:name='{ tag: "p", attrs: { "data-test": "badUsername" } }'
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
    debounceName: debounce(function (e) {
      // TODO - $v.lazy this...
      this.form.name = e.target.value
      this.$v.form.name.$touch()
    }, 700),
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
        [L('cannot contain spaces')]: nonWhitespace
      },
      password: {
        required,
        minLength: minLength(7)
      }
    }
  }
}
</script>
