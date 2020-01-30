<template lang='pug'>
  modal-template(ref='modal')
    template(slot='title')
      i18n Leave group

    form(novalidate @submit.prevent='submit')
      i18n(
        tag='p'
        :args='LTags("strong")'
      ) If you leave, you will stop having access to the {strong_}group chat{_strong} and {strong_}contributions{_strong}. Re-joining the group is possible, but requires other members to {strong_}vote and reach an agreement{_strong}.

      banner-simple.c-banner(severity='danger')
        i18n(
          :args='LTags("strong")'
        ) This action {strong_}cannot be undone{_strong}.

      form(novalidate @submit.prevent='submit')
        label.field
          i18n.label Username
          input.input(
            :class='{error: $v.form.username.$error}'
            type='text'
            v-model='form.username'
            @input='debounceField("username")'
            @blur='updateField("username")'
            v-error:username=''
          )

        password-form(:label='L("Password")' :$v='$v')

        label.field
          i18n.label(:args='{ code }') Type "{code}" below
          input.input(
            :class='{error: $v.form.confirmation.$error}'
            type='text'
            v-model='form.confirmation'
            @input='debounceField("confirmation")'
            @blur='updateField("confirmation")'
            v-error:confirmation=''
          )

        banner-scoped(ref='formMsg')

        .buttons
          i18n.is-outlined(tag='button' @click='close') Cancel
          i18n.is-danger(
            tag='button'
            @click='submit'
            :disabled='$v.form.$invalid'
          ) Leave Group
</template>

<script>
import { validationMixin } from 'vuelidate'
import { mapGetters } from 'vuex'
import ModalTemplate from '@components/modal/ModalTemplate.vue'
import PasswordForm from '@containers/access/PasswordForm.vue'
import { required } from 'vuelidate/lib/validators'
import BannerSimple from '@components/banners/BannerSimple.vue'
import BannerScoped from '@components/banners/BannerScoped.vue'
import L from '@view-utils/translations.js'
import validationsDebouncedMixins from '@view-utils/validationsDebouncedMixins.js'

export default {
  name: 'GroupLeaveModal',
  mixins: [validationMixin, validationsDebouncedMixins],
  components: {
    ModalTemplate,
    PasswordForm,
    BannerSimple,
    BannerScoped
  },
  data () {
    return {
      form: {
        username: null,
        password: null,
        confirmation: null
      }
    }
  },
  computed: {
    ...mapGetters([
      'groupSettings',
      'ourUsername'
    ]),
    code () {
      return `LEAVE ${this.groupSettings.groupName.toUpperCase()}`
    }
  },
  methods: {
    close () {
      this.$refs.modal.close()
    },
    async submit () {
      alert('TODO implement this')
    }
  },
  validations: {
    form: {
      username: {
        [L('This field is required')]: required,
        [L('Your username is different')]: function (value) {
          return value === this.ourUsername
        }
      },
      password: {
        [L('This field is required')]: required
      },
      confirmation: {
        [L('This field is required')]: required,
        [L('Does not match')]: function (value) {
          return value === this.code
        }
      }
    }
  }
}
</script>

<style lang="scss" scoped>
@import "@assets/style/_variables.scss";

.c-banner {
  margin: $spacer*1.5 0;
}
</style>
