<template lang='pug'>
form(data-test='login' @submit.prevent='')
  label.field
    i18n.label Username
    input.input(
      :class='{error: $v.form.username.$error}'
      autocapitalize='off'
      name='username'
      ref='username'
      v-model='form.username'
      @input='debounceField("username")'
      @blur='updateField("username")'
      data-test='loginName'
      v-error:username='{ attrs: { "data-test": "badUsername" } }'
    )

  password-form(:label='L("Password")' name='password' :$v='$v')

  i18n.link.c-forgot(tag='button' type='button' @click='forgotPassword') Forgot your password?

  banner-scoped(ref='formMsg' data-test='loginError')

  .buttons.is-centered
    button-submit(
      @click='login'
      :disabled='$v.form.$invalid'
      data-test='loginSubmit'
    ) {{ L('Login') }}
</template>

<script>
import sbp from '@sbp/sbp'
import { validationMixin } from 'vuelidate'
import { required } from 'vuelidate/lib/validators'
import { L } from '@common/common.js'
import BannerScoped from '@components/banners/BannerScoped.vue'
import ButtonSubmit from '@components/ButtonSubmit.vue'
import PasswordForm from '@containers/access/PasswordForm.vue'
import { requestNotificationPermission } from '@model/notifications/nativeNotification.js'
import validationsDebouncedMixins from '@view-utils/validationsDebouncedMixins.js'
import { usernameValidations } from '@containers/access/SignupForm.vue'
import { Secret } from '@chelonia/lib/Secret'

export default ({
  name: 'LoginForm',
  mixins: [
    validationMixin,
    validationsDebouncedMixins
  ],
  props: {
    // ButtonSubmit component waits until the `click` listener (which is `login` function) is finished
    // This prop is something we could add to wait for it to be finished in `login` process
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
  data () {
    return {
      form: {
        username: '',
        password: ''
      }
    }
  },
  mounted () {
    // NOTE: nextTick is needed because debounceField is called once after the form is mounted
    this.$nextTick(() => {
      this.$refs.username.focus()
    })
  },
  methods: {
    async login () {
      if (this.$v.form.$invalid) {
        this.$refs.formMsg.danger(L('The form is invalid.'))
        return
      }
      try {
        this.$refs.formMsg.clean()

        const username = this.form.username

        this.$emit('login-status', 'submitting')
        await sbp('gi.app/identity/login', {
          username,
          password: new Secret(this.form.password)
        })
        await this.postSubmit()
        this.$emit('login-status', 'success')
        // Request notification permissions now (within short time window of user action:
        // https://github.com/whatwg/notifications/issues/108 )
        requestNotificationPermission({ enableIfGranted: true })
      } catch (e) {
        console.error('FormLogin.vue login() error:', e)
        this.$refs.formMsg.danger(e.message)
        this.$emit('login-status', 'error')
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
        ...usernameValidations
      },
      password: {
        [L('A password is required.')]: required
      }
    }
  }
}: Object)
</script>

<style lang='scss' scoped>
@import "@assets/style/_variables.scss";

.c-forgot {
  display: inline-block;
  margin-top: 1rem;
}
</style>
