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

  form-password(
    :label='L("Password")'
    :$v='$v'
    @input='debounceField("password")'
    @blur='updateField("password")'
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
import { required } from 'vuelidate/lib/validators'
import { nonWhitespace } from '@views/utils/validators.js'
import FormPassword from '@containers/forms/FormPassword.vue'
import L from '@view-utils/translations.js'
import validationsDebouncedMixins from '@view-utils/validationsDebouncedMixins.js'

export default {
  name: 'FormLogin',
  mixins: [
    validationMixin,
    validationsDebouncedMixins
  ],
  components: {
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
        [L('A password is required.')]: required
      }
    }
  }
}
</script>
