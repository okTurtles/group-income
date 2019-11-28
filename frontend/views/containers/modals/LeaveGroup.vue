<template lang='pug'>
  modal-template(class='is-centered' ref='modal')
    form(
      novalidate
      ref='form'
      name='formData'
      @submit.prevent='submit'
    )
      template(slot='title') {{ L('Leave a group') }}

      i18n(
        tag='p'
        :args='LTags("strong")'
      ) 'If you leave, you will stop having access to the {strong_}group chat{_strong} and {strong_}contributions{_strong}. Re-joining the group is possible, but requires other members to {strong_}vote and reach an agreement{_strong}.')

      banner-simple(severity='danger')
        i18n(
          :args='LTags("strong")'
        ) This action {strong_}cannot be undone{_strong}.

      form(
        novalidate
        ref='form'
        name='formData'
        data-test='leaveGroup'
        @submit.prevent='submit'
      )
        .field
          i18n.label(tag='label') Username

          input.input#loginName(
            :class='{error: $v.form.name.$error}'
            name='name'
            v-model='form.name'
            @keyup.enter='submit'
            @input='$v.form.name.$touch()'
            placeholder='username'
            ref='username'
            autofocus
            data-test='loginName'
          )
          i18n.error(
            tag='p'
            v-show='$v.form.name.$error'
          ) username cannot contain spaces

        form-password(
          :label='L("Password")'
          :value='form'
          :v='$v'
          @enter='submit'
          @input='(Password) => {password = Password}'
          data-test='loginPassword'
        )

        .field
          i18n.label(tag='label') Type "Leave The Dreamers" below

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
            html='Please enter the sentence "<b>Leave The Dreamers</b>" to confirm that you leave the group'
          )

        .buttons
          i18n.is-outlined(tag='button' @click='close') Cancel
          i18n.is-danger(
            tag='button'
            @click='submit'
            :disabled='$v.form.$invalid'
          ) Leave Group

      template(slot='errors') {{ form.response }}
</template>

<script>
import { validationMixin } from 'vuelidate'
import ModalTemplate from '@components/Modal/ModalTemplate.vue'
import FormPassword from '@containers/forms/FormPassword.vue'
import { required } from 'vuelidate/lib/validators'
import BannerSimple from '@components/BannerSimple.vue'
import L from '@view-utils/translations.js'

export default {
  name: 'LeaveGroupModal',
  mixins: [validationMixin],
  data () {
    return {
      form: {
        name: null,
        password: null,
        confirmation: null
      }
    }
  },
  validations: {
    form: {
      name: {
        required
      },
      password: {
        required
      },
      confirmation: {
        required,
        checkConfirmation: value => {
          console.log(value)
          return value === L('Leave The Dreamers')
        }
      }
    }
  },
  components: {
    ModalTemplate,
    FormPassword,
    BannerSimple
  },
  methods: {
    close () {
      this.$refs.modal.close()
    },
    async submit () {
      console.error('TODO: implement')
      this.close()
    }
  }
}
</script>

<style lang="scss" scoped>
.modal-card-body {
  padding-top: 0;
}

.message.is-danger {
  width: 100%;
  padding: 1rem;
  margin-top: 1rem;
  margin-bottom: 2rem;
  align-items: center;

  i {
    padding-right: 1rem;
  }
}

.media {
  display: flex;
}
</style>
