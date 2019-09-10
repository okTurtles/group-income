<template lang='pug'>
  form(
    novalidate
    ref='form'
    name='formData'
    @submit.prevent='submit'
  )
    modal-template(class='has-submodal-background is-centered')
      template(slot='title') {{ L('Leave a group') }}

      i18n(tag='h3') Are you sure you want to delete this group?

      i18n(tag='p' html='All messages exchanged between members will be <b>deleted permanently</b>.')

      form(
        novalidate
        ref='form'
        name='formData'
        data-test='deleteGroup'
        @submit.prevent='submit'
      )
        .field
          i18n(tag='label' class='label') Type "Delete The Dreamers" below

          input.input(
            :class='{error: $v.form.confirmation.$error}'
            name='confirmation'
            v-model='form.confirmation'
            @keyup.enter='submit'
            @input='$v.form.confirmation.$touch()'
            placeholder=''
            data-test='confirmation'
          )

          i18n.error(
            tag='p'
            v-show='$v.form.confirmation.$error'
            html='Please enter the sentence "<b>Delete The Dreamers</b>"to confirm that you delete the group'
          )

        .buttons
          i18n.is-outlined(
            tag='button'
            @click='close'
          ) Cancel
          i18n.is-danger(
            tag='button'
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
  mixins: [validationMixin],
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
