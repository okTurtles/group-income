<template lang='pug'>
  .settings-container
    span.c-username @{{ ourUsername }}

    avatar-upload(
      :avatar='attributes.picture'
      :sbpParams='sbpParams'
    )

    section.card
      form(@submit.prevent='')
        label.field
          i18n.label Display Name
          input.input(
            name='displayName'
            type='text'
            v-model='form.displayName'
            placeholder='Name'
            data-test='displayName'
          )
          i18n.helper This is how others will see your name accross the platform.

        label.field
          i18n.label Bio
          textarea.textarea(
            name='bio'
            v-model='form.bio'
            placeholder='Bio'
            data-test='bio'
          )

        label.field
          i18n.label Email
          input.input(
            :class='{error: $v.form.email.$error}'
            name='email'
            type='email'
            v-model='form.email'
            @input='debounceField("email")'
            @blur='updateField("email")'
            data-test='profileEmail'
            v-error:email='{ attrs: { "data-test": "badEmail" } }'
          )

        label.field
          i18n.label Password
          .fake-password(aria-hidden='true') **********

          i18n.link(
            tag='button'
            data-test='passwordBtn'
            @click.prevent='openModal("PasswordModal")'
          ) Update Password

        banner-scoped(ref='formMsg' data-test='profileMsg')

        .buttons
          button-submit.is-success(
            @click='saveProfile'
            data-test='saveAccount'
          ) {{ L('Save account changes') }}

    section.card
      form(name='DeleteProfileForm' @submit.prevent='')
        i18n.is-title-3(tag='h3' class='card-header') Delete account
        p
          i18n Deleting your account will erase all your data, and remove you from the groups you belong to.
          i18n.is-danger This action cannot be undone.

        .buttons
          i18n.button.error.is-outlined(
            tag='button'
            type='submit'
            data-test='deleteAccount'
          ) Delete account
</template>

<script>
import sbp from '@sbp/sbp'
import { validationMixin } from 'vuelidate'
import validationsDebouncedMixins from '@view-utils/validationsDebouncedMixins.js'
import { required, email } from 'vuelidate/lib/validators'
import { OPEN_MODAL } from '@utils/events.js'
import { cloneDeep } from '@model/contracts/shared/giLodash.js'
import { mapGetters } from 'vuex'
import BannerScoped from '@components/banners/BannerScoped.vue'
import AvatarUpload from '@components/AvatarUpload.vue'
import ButtonSubmit from '@components/ButtonSubmit.vue'
import {
  L
} from '@common/common.js'

export default ({
  name: 'UserProfile',
  mixins: [validationMixin, validationsDebouncedMixins],
  components: {
    AvatarUpload,
    BannerScoped,
    ButtonSubmit
  },
  data () {
    // create a copy of the attributes to avoid any Vue.js reactivity weirdness
    // so that we do not directly modify the values in the store
    const attrsCopy = cloneDeep(this.$store.getters.currentIdentityState.attributes || {})
    return {
      form: {
        displayName: attrsCopy.displayName,
        bio: attrsCopy.bio,
        email: attrsCopy.email
      }
    }
  },
  validations: {
    form: {
      email: {
        [L('An email is required.')]: required,
        [L('Please enter a valid email.')]: email
      }
    }
  },
  computed: {
    ...mapGetters([
      'ourUsername'
    ]),
    attributes () {
      return this.$store.getters.currentIdentityState.attributes || {}
    },
    sbpParams () {
      return {
        selector: 'gi.actions/identity/setAttributes',
        contractID: this.$store.state.loggedIn.identityContractID,
        key: 'picture'
      }
    }
  },
  methods: {
    openModal (mode) {
      sbp('okTurtles.events/emit', OPEN_MODAL, mode)
      return false
    },
    async saveProfile () {
      this.$refs.formMsg.clean()
      const attrs = {}

      for (const key in this.form) {
        if (this.form[key] !== this.attributes[key]) {
          attrs[key] = this.form[key]
        }
      }

      try {
        await sbp('gi.actions/identity/setAttributes', {
          data: attrs, contractID: this.$store.state.loggedIn.identityContractID
        })
        this.$refs.formMsg.success(L('Your changes were saved!'))
      } catch (e) {
        console.error('UserProfile saveProfile() error:', e)
        this.$refs.formMsg.danger(e.message)
      }
    }
  }
}: Object)
</script>

<style lang='scss' scoped>
@import "@assets/style/_variables.scss";

.c-username {
  display: none;
  margin-bottom: 2rem;
  margin-top: 0.5rem;
  color: $text_1;

  @include desktop {
    display: block;
  }
}

.fake-password {
  display: inline-block;
  margin-top: 0.5rem;
  margin-left: -1px;
  margin-right: 0.5rem;
}

.legend {
  font-size: $size_5;
  font-weight: bold;
  padding-top: 5px;
  padding-bottom: 5px;
}

.icon-check {
  margin-right: 1rem;
}

</style>
