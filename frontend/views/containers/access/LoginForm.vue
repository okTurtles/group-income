<template lang='pug'>
form(data-test='login' @submit.prevent='')
  label.field
    i18n.label Username
    input.input(
      :class='{error: $v.form.username.$error}'
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
import { requestNotificationPermission } from '@model/contracts/shared/nativeNotification.js'
import validationsDebouncedMixins from '@view-utils/validationsDebouncedMixins.js'
import { usernameValidations } from '@containers/access/SignupForm.vue'

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
        username: null,
        password: null
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
      if (typeof document.body.dispatchEvent === 'function') {
        this.$refs.username.dispatchEvent(new Event('input'))
        // TODO: password input too
      }
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
        await this.postSubmit()
        this.$emit('submit-succeeded')

        requestNotificationPermission()
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
