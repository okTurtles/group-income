<template lang='pug'>
  .settings-container
    span.c-username @{{ ourUsername }}

    avatar-upload(
      :avatar='attributes.picture'
      :sbpParams='sbpParams'
      avatarType='user'
    )

    section.card
      form(@submit.prevent='')
        label.field
          .c-display-name-label-container
            i18n.label Display Name
            char-length-indicator(
              v-if='form.displayName'
              :current-length='form.displayName.length || 0'
              :max='config.displayNameMaxChar'
              :error='$v.form.displayName.$error'
            )

          input.input(
            name='displayName'
            type='text'
            v-model='form.displayName'
            :maxlength='config.displayNameMaxChar'
            placeholder='Name'
            data-test='displayName'
          )

          i18n.helper This is how others will see your name accross the platform.

        label.field
          .c-bio-label-container
            i18n.label Bio
            char-length-indicator(
              v-if='form.bio'
              :current-length='form.bio.length || 0'
              :max='config.bioMaxChar'
              :error='$v.form.bio.$error'
            )
          textarea.textarea(
            name='bio'
            v-model='form.bio'
            :maxlength='config.bioMaxChar'
            :class='{ error: $v.form.bio.$error }'
            placeholder='Bio'
            data-test='bio'
          )

        label.field
          i18n.label Password
          .fake-password(aria-hidden='true') **********

          i18n.link(
            tag='button'
            type='button'
            data-test='passwordBtn'
            @click.prevent='openModal("PasswordModal")'
          ) Update Password

        banner-scoped(ref='formMsg' data-test='profileMsg')

        .buttons
          button-submit.is-success(
            @click='saveProfile'
            data-test='saveAccount'
          ) {{ L('Save account changes') }}
</template>

<script>
import sbp from '@sbp/sbp'
import { validationMixin } from 'vuelidate'
import validationsDebouncedMixins from '@view-utils/validationsDebouncedMixins.js'
import { OPEN_MODAL } from '@utils/events.js'
import { cloneDeep } from 'turtledash'
import { mapGetters, mapState } from 'vuex'
import BannerScoped from '@components/banners/BannerScoped.vue'
import AvatarUpload from '@components/AvatarUpload.vue'
import ButtonSubmit from '@components/ButtonSubmit.vue'
import CharLengthIndicator from '@components/CharLengthIndicator.vue'
import { L } from '@common/common.js'
import { IDENTITY_BIO_MAX_CHARS, IDENTITY_USERNAME_MAX_CHARS } from '@model/contracts/shared/constants.js'

export default ({
  name: 'UserProfile',
  mixins: [validationMixin, validationsDebouncedMixins],
  components: {
    AvatarUpload,
    BannerScoped,
    ButtonSubmit,
    CharLengthIndicator
  },
  data () {
    // create a copy of the attributes to avoid any Vue.js reactivity weirdness
    // so that we do not directly modify the values in the store
    const attrsCopy = cloneDeep(this.$store.getters.currentIdentityState.attributes || {})
    return {
      form: {
        displayName: attrsCopy.displayName,
        bio: attrsCopy.bio
      },
      config: {
        bioMaxChar: IDENTITY_BIO_MAX_CHARS,
        displayNameMaxChar: IDENTITY_USERNAME_MAX_CHARS
      }
    }
  },
  validations: {
    form: {
      displayName: {
        [L('Reached character limit.')]: (value) => {
          return !value || Number(value.length) <= IDENTITY_USERNAME_MAX_CHARS
        }
      },
      bio: {
        [L('Reached character limit.')]: (value) => {
          return !value || Number(value.length) <= IDENTITY_BIO_MAX_CHARS
        }
      }
    }
  },
  computed: {
    ...mapState(['loggedIn']),
    ...mapGetters(['ourUsername', 'currentIdentityState']),
    attributes () {
      return this.currentIdentityState.attributes || {}
    },
    sbpParams () {
      return {
        selector: 'gi.actions/identity/setAttributes',
        contractID: this.loggedIn.identityContractID,
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

      if (Object.keys(attrs).length) {
        try {
          await sbp('gi.actions/identity/setAttributes', {
            data: attrs, contractID: this.loggedIn.identityContractID
          })
          this.$refs.formMsg.success(L('Your changes were saved!'))
        } catch (e) {
          console.error('UserProfile saveProfile() error:', e)
          this.$refs.formMsg.danger(e.message)
        }
      }
    }
  }
}: Object)
</script>

<style lang='scss' scoped>
@import "@assets/style/_variables.scss";

.settings-container {
  width: 100%;
}

.c-username {
  display: none;
  margin-bottom: 2rem;
  margin-top: 0.5rem;
  color: $text_1;

  @include desktop {
    display: block;
  }
}

.c-display-name-label-container,
.c-bio-label-container {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
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
