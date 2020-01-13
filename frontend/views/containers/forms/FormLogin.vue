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

  i18n.link.c-forgot(tag='a' @click='forgotPassword') Forgot your password?

  banner-scoped(ref='formMsg' data-test='loginError')

  .buttons.is-centered
    i18n(
      tag='button'
      :disabled='$v.form.$invalid'
      data-test='loginSubmit'
      type='submit'
    ) Login
</template>

<script>
import { validationMixin } from 'vuelidate'
import { required } from 'vuelidate/lib/validators'
import { nonWhitespace } from '@views/utils/validators.js'
import FormPassword from '@containers/forms/FormPassword.vue'
import BannerScoped from '@components/BannerScoped.vue'
import L from '@view-utils/translations.js'
import validationsDebouncedMixins from '@view-utils/validationsDebouncedMixins.js'
import login from '../../../actions/login.js'

export default {
  name: 'FormLogin',
  mixins: [
    validationMixin,
    validationsDebouncedMixins
  ],
  components: {
    FormPassword,
    BannerScoped
  },
  data () {
    return {
      form: {
        name: null,
        password: null
      }
    }
  },
  inserted () {
    this.$refs.username.focus()
  },
  methods: {
    async login () {
      try {
        await login({
          username: this.form.name,
          password: this.form.password
        })

        this.$emit('submitSucceeded')
      } catch (e) {
        if (e.cause === 'INVALID_MATCH') {
          this.$refs.formMsg.danger(L('Invalid username or password'))
        } else {
          console.error(e)
          this.$refs.formMsg.danger(L('Failed to login. {codeError}', { codeError: e.message }))
        }
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

<style lang='scss' scoped>
@import "@assets/style/_variables.scss";

.c-forgot {
  display: inline-block;
  margin-top: $spacer;
}
</style>
