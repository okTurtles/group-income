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
import sbp from '~/shared/sbp.js'
import { validationMixin } from 'vuelidate'
import { required } from 'vuelidate/lib/validators'
import { nonWhitespace } from '@views/utils/validators.js'
import FormPassword from '@containers/forms/FormPassword.vue'
import BannerScoped from '@components/BannerScoped.vue'
import L from '@view-utils/translations.js'
import validationsDebouncedMixins from '@view-utils/validationsDebouncedMixins.js'

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
        // TODO: Insert cryptography here
        const identityContractID = await sbp('namespace/lookup', this.form.name)
        if (!identityContractID) {
          this.$refs.formMsg.danger(L('Invalid username or password'))
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
        this.$refs.formMsg.danger(`${L('Something went wrong, please try again.')} ${error.message}`)
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
