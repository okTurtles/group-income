<template lang='pug'>
  form(
    novalidate
    ref='form'
    name='formData'
    @submit.prevent='changePassword'
  )
    modal-template(class="has-submodal-background is-centered")
      template(slot='title') Change password

      form-password(
        name='current'
        :label='L("Current Password")'
        :value='form'
        :v='$v.form'
        @enter='changePassword'
        @input='(password) => { newPassword = password }'
        :hasIconRight='true'
        :showPlaceholder='false'
        :showPassword='false'
        size='is-large'
      )

      form-password(
        name='newPassword'
        :label='L("New Password")'
        :value='form'
        :v='$v.form'
        @enter='changePassword'
        @input='(password) => { newPassword = password }'
        :hasIconRight='true'
        :showPlaceholder='false'
        :showPassword='false'
        size='is-large'
      )

      form-password(
        name='confirm'
        :label='L("Confirm new Password")'
        :value='form'
        :v='$v.form'
        @enter='changePassword'
        @input='(password) => { newPassword = password }'
        :hasIconRight='true'
        :showPlaceholder='false'
        :showPassword='false'
        size='is-large'
      )

      template(slot='errors') {{ form.response }}

      template(slot='buttons')
        button.button.is-outlined(
          @click='close'
        ) Cancel
        button.button.is-success(
          @click='changePassword'
          :disabled='$v.form.$invalid'
        ) Change password

</template>
<script>
import { validationMixin } from 'vuelidate'
import ModalTemplate from '@components/Modal/ModalTemplate.vue'
import FormPassword from '@components/Forms/Password.vue'
import { required, minLength } from 'vuelidate/lib/validators'
import sameAs from 'vuelidate/lib/validators/sameAs.js'
import { CLOSE_MODAL } from '@utils/events.js'
import sbp from '~/shared/sbp.js'
import L from '@views/utils/translations.js'

export default {
  name: 'PasswordModal',
  mixins: [ validationMixin ],
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
    FormPassword
  },
  methods: {
    close () {
      sbp('okTurtles.events/emit', CLOSE_MODAL)
    },
    async changePassword () {
      try {
        // TODO check password
        this.close()
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
