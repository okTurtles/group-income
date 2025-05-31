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

      banner-simple.c-banner(severity='general' v-if='!ownResources')
        i18n Loading
      banner-simple.c-banner(severity='warning' v-else-if='Array.isArray(ownResources) && ownResources.length')
        i18n(tag='p') This action will also delete the following groups:
        ul.c-list
          li.c-item(v-for='groupName in ownResources') {{groupName}}
      banner-simple.c-banner(severity='danger' v-else-if='ownResources.message')
        i18n(tag='p') This action will also delete any groups you've created.
        i18n(tag='p' :args='{message: ownResources.message}') An error occurred that prevents us from showing a list of these groups. The error was: {message}

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
        i18n.is-outlined(tag='button' type='button' @click='close') Cancel
        button-submit.is-danger(
          @click='submit'
          :disabled='$v.form.$invalid || !this.ownResources'
          data-test='btnSubmit'
          ) {{ L('Delete account') }}
</template>

<script>
import sbp from '@sbp/sbp'
import { L } from '@common/common.js'
import { validationMixin } from 'vuelidate'
import { required } from 'vuelidate/lib/validators'
import { mapGetters } from 'vuex'
import ModalTemplate from '@components/modal/ModalTemplate.vue'
import BannerSimple from '@components/banners/BannerSimple.vue'
import BannerScoped from '@components/banners/BannerScoped.vue'
import ButtonSubmit from '@components/ButtonSubmit.vue'
import PasswordForm from '@containers/access/PasswordForm.vue'
import validationsDebouncedMixins from '@view-utils/validationsDebouncedMixins.js'
import { normalizeString } from 'turtledash'
import { Secret } from 'libchelonia/Secret'

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
  beforeMount () {
    sbp('chelonia/out/ownResources', this.ourIdentityContractId).then((ownResources) => {
      const rootState = sbp('state/vuex/state')
      this.ownResources = ownResources.filter((cid) => {
        return rootState.contracts[cid]?.type === 'gi.contracts/group'
      }).map((cid) => {
        const rootGetters = sbp('state/vuex/getters')
        return rootGetters.groupSettingsForGroup(rootState[cid]).groupName
      })
    }).catch((e) => {
      this.ownResources = new Error(e?.message)
      console.error('Error fetching own resources', { contractID: this.ourIdentityContractId }, e)
    })
  },
  data () {
    return {
      form: {
        username: null,
        confirmation: null,
        password: null
      },
      ownResources: null
    }
  },
  computed: {
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
        this.close()
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
