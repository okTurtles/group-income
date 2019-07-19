<template lang='pug'>
  form(
    novalidate
    ref='form'
    name='formData'
    @submit.prevent='submit'
  )
    modal-template(class='has-submodal-background is-centered')
      template(slot='title') Leave a group

      h3 Are you sure you want to delete this group?

      p All messages exchanged between members will be #[b() deleted permanently].

      form(
        novalidate
        ref='form'
        name='formData'
        data-test='deleteGroup'
        @submit.prevent='submit'
      )
        .field
          label.label
            i18n Type "Delete The Dreamers" below

          input.input(
            :class="{'error': $v.form.confirmation.$error}"
            name='confirmation'
            v-model='form.confirmation'
            @keyup.enter='submit'
            @input='$v.form.confirmation.$touch()'
            placeholder=''
            data-test='confirmation'
          )

          p.error(
            v-show='$v.form.confirmation.$error'
          )
            i18n Please enter the sentence "#[b Delete The Dreamers]" to confirm that you delete the group

        .buttons
          button.is-outlined(
            @click='close'
          ) Cancel
          button.is-danger(
            @click='submit'
            :disabled='$v.form.$invalid'
          ) Delete Group

      template(slot='errors') {{ form.response }}
</template>

<script>
import { validationMixin } from 'vuelidate'
import ModalTemplate from '@components/Modal/ModalTemplate.vue'
import { required } from 'vuelidate/lib/validators'
import { CLOSE_MODAL } from '@utils/events.js'
import sbp from '~/shared/sbp.js'

export default {
  name: 'deleteGroupModal',
  mixins: [ validationMixin ],
  data () {
    return {
      form: {
        confirmation: null
      }
    }
  },
  validations: {
    form: {
      confirmation: {
        required,
        checkConfirmation: value => {
          console.log(value)
          return value === 'Delete The Dreamers'
        }
      }
    }
  },
  components: {
    ModalTemplate
  },
  methods: {
    close () {
      sbp('okTurtles.events/emit', CLOSE_MODAL)
    },
    async submit () {
      console.error('TODO: implement')
      this.close()
    }
  }
}
</script>

<style lang="scss" scoped>
h3 {
  align-self: start;
  margin-bottom: 0;
}

form {
  margin-top: 2rem;
}
</style>
