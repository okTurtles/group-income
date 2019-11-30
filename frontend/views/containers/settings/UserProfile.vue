<template lang='pug'>
  .settings-container
    span.c-username @{{ ourUsername }}

    form(@submit.prevent='')
      .c-avatar
        label.c-avatar-field
          avatar.c-avatar-img(
            :src='attributes.picture'
            ref='picture'
          )
          i18n.link.c-avatar-text Change avatar

          input.sr-only(
            type='file'
            name='profilePicture'
            accept='image/*'
            @change='fileChange($event.target.files)'
            placeholder='http://'
            data-test='profilePicture'
          )
        // TODO #658
        banner-scoped.c-pictureMsg(ref='pictureMsg' data-test='pictureMsg')

    section.card
      form(@submit.prevent='saveProfile')
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
          i18n.is-success(
            tag='button'
            :disabled='$v.form.$invalid'
            type='submit'
            data-test='saveAccount'
          ) Save account changes

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
import { validationMixin } from 'vuelidate'
import validationsDebouncedMixins from '@view-utils/validationsDebouncedMixins.js'
import { required, email } from 'vuelidate/lib/validators'
import { OPEN_MODAL } from '@utils/events.js'
import { cloneDeep } from '@utils/giLodash.js'
import { mapGetters } from 'vuex'
import imageUpload from '@utils/imageUpload.js'
import Avatar from '@components/Avatar.vue'
import BannerScoped from '@components/BannerScoped.vue'
import sbp from '~/shared/sbp.js'
import L from '@view-utils/translations.js'

export default {
  name: 'UserProfile',
  mixins: [validationMixin, validationsDebouncedMixins],
  components: {
    Avatar,
    BannerScoped
  },
  data () {
    // create a copy of the attributes to avoid any Vue.js reactivity weirdness
    // so that we do not directly modify the values in the store
    const attrsCopy = cloneDeep(this.$store.getters.ourUserIdentityContract.attributes || {})
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
      return this.$store.getters.ourUserIdentityContract.attributes || {}
    }
  },
  methods: {
    openModal (mode) {
      sbp('okTurtles.events/emit', OPEN_MODAL, mode)
      return false
    },
    async fileChange (fileList) {
      if (!fileList.length) return
      const fileReceived = fileList[0]
      let picture

      try {
        picture = await imageUpload(fileReceived)
      } catch (e) {
        console.error(e)
        this.$refs.pictureMsg.danger(L('Failed to upload picture, please try again. {codeError}', { codeError: e.message }))
        return false
      }

      try {
        await this.setAttributes({ picture })
        this.$refs.picture.setFromBlob(fileReceived)
        this.$refs.pictureMsg.success(L('Picture updated!'))
      } catch (e) {
        console.error('Failed to save picture', e)
        this.$refs.pictureMsg.danger(L('Failed to save picture, please try again. {codeError}', { codeError: e.message }))
      }
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
        await this.setAttributes(attrs)
        this.$refs.formMsg.success(L('Your changes were saved!'))
      } catch (e) {
        console.error('Failed to update profile', e)
        this.$refs.formMsg.danger(L('Failed to update profile, please try again. {codeError}', { codeError: e.message }))
      }
    },
    async setAttributes (attrs) {
      const attributes = await sbp('gi.contracts/identity/setAttributes/create',
        attrs,
        this.$store.state.loggedIn.identityContractID
      )
      await sbp('backend/publishLogEntry', attributes)
    }
  }
}
</script>

<style lang='scss' scoped>
@import "@assets/style/_variables.scss";

.c-avatar-field {
  @include desktop {
    position: absolute;
    top: -3.5rem;
    right: 0;
    align-items: flex-end;
  }
}

.c-avatar {
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  text-align: center;

  @include desktop {
    align-items: flex-end;

    label {
      margin-bottom: -0.5rem; /* temporary until #658 */
    }
  }

  &-img {
    width: 8rem;
    height: 8rem;
    margin-bottom: $spacer-sm;

    @include desktop {
      width: 4.5rem;
      height: 4.5rem;
    }
  }

  &-text {
    display: inline-block;
  }
}

.c-pictureMsg {
  width: 100%;

  ::v-deep .c-banner {
    margin: 0.5rem 0 $spacer*1.5;
  }
}

.c-username {
  display: none;
  margin-bottom: $spacer-lg;
  margin-top: $spacer-sm;
  color: $text_1;

  @include desktop {
    display: block;
  }
}

.fake-password {
  display: inline-block;
  margin-top: $spacer-sm;
  margin-left: -1px;
  margin-right: $spacer-sm;
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
