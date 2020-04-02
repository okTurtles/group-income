<template lang='pug'>
form(data-test='login' @submit.prevent='')
  label.field
    i18n.label Username
    input.input(
      :class='{error: $v.form.username.$error}'
      name='username'
      v-model='form.username'
      @input='debounceField("username")'
      @blur='updateField("username")'
      data-test='loginName'
      v-error:username='{ attrs: { "data-test": "badUsername" } }'
      autofocus
    )

  password-form(:label='L("Password")' name='password' :$v='$v')

  i18n.link.c-forgot(tag='a' @click='forgotPassword') Forgot your password?

  banner-scoped(ref='formMsg' data-test='loginError')

  .buttons.is-centered
    button-submit(
      @click='login'
      :disabled='$v.form.$invalid'
      data-test='loginSubmit'
    ) {{ L('Login') }}
</template>

<script>
import { validationMixin } from 'vuelidate'
import { required } from 'vuelidate/lib/validators'
import sbp from '~/shared/sbp.js'
import { nonWhitespace } from '@views/utils/validators.js'
import PasswordForm from '@containers/access/PasswordForm.vue'
import BannerScoped from '@components/banners/BannerScoped.vue'
import ButtonSubmit from '@components/ButtonSubmit.vue'
import L from '@view-utils/translations.js'
import validationsDebouncedMixins from '@view-utils/validationsDebouncedMixins.js'

export default {
  name: 'LoginForm',
  mixins: [
    validationMixin,
    validationsDebouncedMixins
  ],
  components: {
    PasswordForm,
    BannerScoped,
    ButtonSubmit
  },
  data () {
    return {
      form: {
        username: null,
        password: null
      }
    }
  },
  inserted () {
    this.$refs.username.focus()
  },
  methods: {
    async login () {
      if (this.$v.form.$invalid) {
        this.$refs.formMsg.danger(L('The form is invalid.'))
        return
      }

      try {
        this.$refs.formMsg.clean()

        await sbp('gi.actions/identity/login', {
          username: this.form.username,
          password: this.form.password
        })
        this.$emit('submitSucceeded')
      } catch (e) {
        console.error('FormLogin.vue login() error:', e)
        this.$refs.formMsg.danger(e.message)
      }
    },
    forgotPassword () {
      // TODO: implement forgot password
      alert(L('Coming soon'))
    }
  },
  validations: {
    form: {
      username: {
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
