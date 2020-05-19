<template lang='pug'>
form(data-test='signup' @submit.prevent='')
  label.field
    i18n.label Username
    input.input(
      :class='{error: $v.form.username.$error}'
      name='username'
      @input='e => debounceValidation("username", e.target.value)'
      @blur='e => updateField("username", e.target.value)'
      data-test='signName'
      v-error:username='{ attrs: { "data-test": "badUsername" } }'
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

  avatar-generator(@generated='handleAvatarUrl')

  banner-scoped(ref='formMsg')

  .buttons.is-centered
    button-submit(
      @click='signup'
      data-test='signSubmit'
      :disabled='$v.form.$invalid'
    ) {{ L('Create an account') }}
</template>

<script>
import AvatarGenerator from '@components/AvatarGenerator.vue'
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
import imageUpload from '@utils/imageUpload.js'

export default {
  name: 'SignupForm',
  mixins: [
    validationMixin,
    validationsDebouncedMixins
  ],
  components: {
    AvatarGenerator,
    ModalTemplate,
    PasswordForm,
    BannerScoped,
    ButtonSubmit
  },
  data () {
    return {
      form: {
        username: null,
        password: null,
        email: null,
        pictureBase64: null
      }
    }
  },
  computed: {
    sbpParams () {
      return {
        selector: 'gi.contracts/identity/setAttributes/create',
        contractID: this.$store.state.loggedIn.identityContractID,
        key: 'picture'
      }
    }
  },
  methods: {
    handleAvatarUrl (url) {
      this.form.pictureBase64 = url
    },
    async signup () {
      if (this.$v.form.$invalid) {
        this.$refs.formMsg.danger(L('The form is invalid.'))
        return
      }

      let picture

      try {
        if (this.form.pictureBase64) {
          picture = await imageUpload(this.form.pictureBase64, { type: 'base64' })
        }
      } catch (e) {
        console.error('Signup.vue submit() - imageUpload error:', e)
        // Don't throw any error because there's nothing the user can do about it.
        // Just keep going and create the profile without giving a generated picture.
      }

      try {
        await sbp('gi.actions/identity/signupAndLogin', {
          username: this.form.username,
          email: this.form.email,
          password: this.form.password,
          picture
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
      username: {
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
