<template lang='pug'>
form(
  novalidate
  name='formData'
  data-test='signup'
  @submit.prevent=''
)
  label.field
    i18n.label Username
    input.input(
      :class='{error: $v.form.name.$error}'
      name='name'
      @input='e => debounceValidation("name", e.target.value)'
      @blur='e => updateField("name", e.target.value)'
      data-test='signName'
      v-error:name='{ attrs: { "data-test": "badUsername" } }'
    )

  label.field
    i18n.label Email
    input.input(
      :class='{error: $v.form.email.$error}'
      name='email'
      type='email'
      v-model='form.email'
      @input='debounceField("email")'
      @blur='updateField("email")'
      data-test='signEmail'
      v-error:email='{ attrs: { "data-test": "badEmail" } }'
    )

  password-form(:label='L("Password")' name='password' :$v='$v')

  banner-scoped(ref='formMsg')

  .buttons.is-centered
    button-submit(
      @click='signup'
      data-test='signSubmit'
    ) {{ L('Create an account') }}
</template>

<script>
import { required, minLength, email } from 'vuelidate/lib/validators'
import { validationMixin } from 'vuelidate'
import sbp from '~/shared/sbp.js'
import { nonWhitespace } from '@views/utils/validators.js'
import ModalTemplate from '@components/modal/ModalTemplate.vue'
import PasswordForm from '@containers/access/PasswordForm.vue'
import BannerScoped from '@components/banners/BannerScoped.vue'
import ButtonSubmit from '@components/ButtonSubmit.vue'
import L from '@view-utils/translations.js'
import validationsDebouncedMixins from '@view-utils/validationsDebouncedMixins.js'

export default {
  name: 'SignupForm',
  mixins: [
    validationMixin,
    validationsDebouncedMixins
  ],
  components: {
    ModalTemplate,
    PasswordForm,
    BannerScoped,
    ButtonSubmit
  },
  data () {
    return {
      form: {
        name: null,
        password: null,
        email: null
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
        await sbp('gi.actions/user/signupAndLogin', {
          username: this.form.name,
          email: this.form.email,
          password: this.form.password
        })
        this.$emit('submitSucceeded')
      } catch (e) {
        console.error('Signup.vue submit() error:', e)
        this.$refs.formMsg.danger(e.message)
      }
    }
  },
  validations: {
    form: {
      name: {
        [L('A username is required.')]: required,
        [L('A username cannot contain spaces.')]: nonWhitespace,
        [L('This username is already being used.')]: async (value) => {
          return !await sbp('namespace/lookup', value)
        }
      },
      password: {
        [L('A password is required.')]: required,
        [L('Your password must be at least 7 characteres long.')]: minLength(7)
      },
      email: {
        [L('An email is required.')]: required,
        [L('Please enter a valid email.')]: email
      }
    }
  }
}
</script>
