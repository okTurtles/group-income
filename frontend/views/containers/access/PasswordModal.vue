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
      @input='(password) => { newPassword = password }'
      :hasIconRight='true'
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
      @input='(password) => { newPassword = password }'
      :hasIconRight='true'
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
      @input='(password) => { newPassword = password }'
      :hasIconRight='true'
      :showPlaceholder='false'
      :showPassword='false'
      size='is-large'
    )

    .buttons
      i18n.is-outlined(
        tag='button'
        data-test='cancel'
        @click='closeModal'
      ) Cancel

      i18n.is-success(
        tag='button'
        data-test='submit'
        @click='changePassword'
        :disabled='$v.form.$invalid || processing'
      ) Change password

  template(slot='errors') {{ form.response }}
</template>
<script>
import { validationMixin } from 'vuelidate'
import ModalTemplate from '@components/modal/ModalTemplate.vue'
import PasswordForm from '@containers/access/PasswordForm.vue'
import sbp from '@sbp/sbp'
import { required, minLength } from 'vuelidate/lib/validators'
import sameAs from 'vuelidate/lib/validators/sameAs.js'
import { L } from '@common/common.js'
import { Secret } from '~/shared/domains/chelonia/Secret.js'

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
        required
      },
      newPassword: {
        required,
        nonWhitespace: value => /^\S+$/.test(value),
        minLength: minLength(7)
      },
      confirm: {
        required,
        sameAsPassword: sameAs('newPassword')
      }
    }
  },
  components: {
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
          this.form.response = L('Invalid password')
          console.error('[PasswordModal.vue]', error)
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
