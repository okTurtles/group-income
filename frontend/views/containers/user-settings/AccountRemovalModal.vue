<template lang='pug'>
  modal-template(ref='modal' :a11yTitle='L("Delete account")')
    template(slot='title')
      i18n Delete account

    form(novalidate @submit.prevent='' data-test='deleteAccount')
      i18n(
        tag='p'
      ) Deleting your account will erase all your data, and remove you from the groups you belong to.

      banner-simple.c-banner(severity='danger')
        i18n(
          :args='LTags("strong")'
        ) This action {strong_}cannot be undone{_strong}.

      label.field
        i18n.label Username
        input.input(
          :class='{error: $v.form.username.$error}'
          type='text'
          v-model='form.username'
          @input='debounceField("username")'
          @blur='updateField("username")'
          data-test='username'
          v-error:username='{ attrs: { "data-test": "usernameError" } }'
        )

      password-form(
        name='password'
        :label='L("Password")'
        :value='form'
        :$v='$v'
        :hasIconRight='true'
        :showPlaceholder='false'
        :showPassword='false'
        size='is-large'
      )

      label.field
        i18n.label(:args='{ code }') Type "{code}" below
        input.input(
          :class='{error: $v.form.confirmation.$error}'
          type='text'
          v-model='form.confirmation'
          @input='debounceField("confirmation")'
          @blur='updateField("confirmation")'
          v-error:confirmation='{ attrs: { "data-test": "confirmationError" } }'
          data-test='confirmation'
        )

      banner-scoped(ref='formMsg')

      .buttons
        i18n.is-outlined(tag='button' @click='close') Cancel
        button-submit.is-danger(
          @click='submit'
          :disabled='$v.form.$invalid'
          data-test='btnSubmit'
          ) {{ L('Delete account') }}
</template>

<script>
import sbp from '@sbp/sbp'
import { L } from '@common/common.js'
import { validationMixin } from 'vuelidate'
import { required } from 'vuelidate/lib/validators'
import { mapGetters, mapState } from 'vuex'
import ModalTemplate from '@components/modal/ModalTemplate.vue'
import BannerSimple from '@components/banners/BannerSimple.vue'
import BannerScoped from '@components/banners/BannerScoped.vue'
import ButtonSubmit from '@components/ButtonSubmit.vue'
import PasswordForm from '@containers/access/PasswordForm.vue'
import validationsDebouncedMixins from '@view-utils/validationsDebouncedMixins.js'
import { normalizeString } from 'turtledash'
import { Secret } from '~/shared/domains/chelonia/Secret.js'

export default ({
  name: 'AccountRemovalModal',
  mixins: [validationMixin, validationsDebouncedMixins],
  components: {
    ModalTemplate,
    BannerSimple,
    BannerScoped,
    ButtonSubmit,
    PasswordForm
  },
  data () {
    return {
      form: {
        username: null,
        confirmation: null,
        password: null
      }
    }
  },
  computed: {
    ...mapState([
      'currentGroupId'
    ]),
    ...mapGetters([
      'groupSettings',
      'ourUsername',
      'ourIdentityContractId'
    ]),
    code () {
      return L('DELETE ACCOUNT')
    }
  },
  methods: {
    close () {
      this.$refs.modal.close()
    },
    async submit () {
      if (this.$v.form.$invalid) { return }
      try {
        await sbp('gi.app/identity/delete', this.ourIdentityContractId, new Secret(this.form.password))
      } catch (e) {
        console.error('AccountRemovalModal submit() error:', e)
        this.$refs.formMsg.danger(e.message)
      }
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
      confirmation: {
        [L('This field is required')]: required,
        [L('Does not match')]: function (value) {
          return normalizeString(value) === normalizeString(this.code)
        }
      },
      password: {
        [L('Your current password is required.')]: required
      }
    }
  }
}: Object)
</script>

<style lang="scss" scoped>
@import "@assets/style/_variables.scss";

.c-banner {
  margin: 1.5rem 0;
}
</style>
