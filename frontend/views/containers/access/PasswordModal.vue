<template lang='pug'>
modal-template(class='is-centered is-left-aligned' back-on-mobile=true ref='modalTemplate' data-test='PasswordModal' :a11yTitle='L("Change Password")')
  template(slot='title') Change password

  form(
    novalidate
    ref='form'
    name='formData'
    @submit.prevent='changePassword'
  )
    password-form(
      name='current'
      :label='L("Current Password")'
      :value='form'
      :$v='$v'
      @enter='changePassword'
      :showPlaceholder='false'
      :showPassword='false'
      size='is-large'
    )

    password-form(
      name='newPassword'
      :label='L("New Password")'
      :value='form'
      :$v='$v'
      @enter='changePassword'
      :showPlaceholder='false'
      :showPassword='false'
      size='is-large'
    )

    password-form(
      name='confirm'
      :label='L("Confirm new Password")'
      :value='form'
      :$v='$v'
      @enter='changePassword'
      :showPlaceholder='false'
      :showPassword='false'
      size='is-large'
    )

    banner-scoped(ref='formMsg')

    .buttons
      i18n.is-outlined(
        tag='button'
        type='button'
        data-test='cancel'
        @click='closeModal'
      ) Cancel

      button-submit(
        @click='changePassword'
        data-test='submit'
        :disabled='$v.form.$invalid || processing'
      ) {{ L('Change password') }}
</template>
<script>
import { validationMixin } from 'vuelidate'
import ModalTemplate from '@components/modal/ModalTemplate.vue'
import BannerScoped from '@components/banners/BannerScoped.vue'
import ButtonSubmit from '@components/ButtonSubmit.vue'
import PasswordForm from '@containers/access/PasswordForm.vue'
import { IDENTITY_PASSWORD_MIN_CHARS as passwordMinChars } from '@model/contracts/shared/constants.js'
import sbp from '@sbp/sbp'
import { required, minLength } from 'vuelidate/lib/validators'
import sameAs from 'vuelidate/lib/validators/sameAs.js'
import { L } from '@common/common.js'
import { Secret } from '@chelonia/lib/Secret'

export default ({
  name: 'PasswordModal',
  mixins: [validationMixin],
  data () {
    return {
      form: {
        current: null,
        newPassword: null,
        confirm: null
      },
      processing: false
    }
  },
  validations: {
    form: {
      current: {
        [L('Your current password is required.')]: required
      },
      newPassword: {
        [L('A password is required.')]: required,
        nonWhitespace: value => /^\S+$/.test(value),
        [L('Your password must be at least {minChars} characters long.', { minChars: passwordMinChars })]: minLength(passwordMinChars)
      },
      confirm: {
        [L('Please confirm your password.')]: required,
        [L('Passwords do not match.')]: sameAs('newPassword')
      }
    }
  },
  components: {
    BannerScoped,
    ButtonSubmit,
    ModalTemplate,
    PasswordForm
  },
  methods: {
    closeModal () {
      // We access directly the modal here to avoid broacasting event to every possible modal
      this.$refs.modalTemplate.close()
    },
    changePassword () {
      if (this.processing) return
      this.processing = true
      ;(async () => {
        try {
          await sbp('gi.app/identity/changePassword',
            new Secret(this.form.current),
            new Secret(this.form.newPassword)
          )
          this.closeModal()
        } catch (error) {
          console.error('[PasswordModal.vue]', error)
          this.$refs.formMsg.danger(L('Invalid password'))
        }
      })().finally(() => {
        this.processing = false
      })
    }
  }
}: Object)
</script>

<style lang="scss" scoped>
.modal-card-body {
  padding-top: 0;
}
</style>
