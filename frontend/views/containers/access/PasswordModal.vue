<template lang='pug'>
modal-template(class='is-centered is-left-aligned' back-on-mobile=true ref='modalTemplate' :a11yTitle='L("Change Password")')
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
        @click='closeModal'
      ) Cancel

      i18n.is-success(
        tag='button'
        @click='changePassword'
        :disabled='$v.form.$invalid'
      ) Change password

  template(slot='errors') {{ form.response }}
</template>
<script>
import { validationMixin } from 'vuelidate'
import ModalTemplate from '@components/modal/ModalTemplate.vue'
import PasswordForm from '@containers/access/PasswordForm.vue'
import { required, minLength } from 'vuelidate/lib/validators'
import sameAs from 'vuelidate/lib/validators/sameAs.js'
import L from '@view-utils/translations.js'

export default {
  name: 'PasswordModal',
  mixins: [validationMixin],
  data () {
    return {
      form: {
        current: null,
        newPassword: null,
        confirm: null
      }
    }
  },
  validations: {
    form: {
      current: {
        required,
        checkOldPassword: value => {
          // TODO
          console.log('Todo: check password')
          if (value === '') return false

          // simulate async call, fail for all logins with even length
          return new Promise((resolve, reject) => {
            setTimeout(() => {
              resolve(typeof value === 'string' && value.length % 2 !== 0)
            }, 350 + Math.random() * 300)
          })
        }
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
    async changePassword () {
      try {
        // TODO check password
        this.closeModal()
      } catch (error) {
        this.form.response = L('Invalid password')
        console.error(error)
      }
    }
  }
}
</script>

<style lang="scss" scoped>
.modal-card-body {
  padding-top: 0;
}
</style>
