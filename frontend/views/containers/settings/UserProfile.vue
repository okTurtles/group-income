<template lang='pug'>
  .settings-container
    p.username @{{ userName }}

    section.card
      form(
        ref='ProfileForm'
        name='ProfileForm'
        @submit.prevent='save'
      )
        p.is-success(
          v-if='ephemeral.profileSaved'
          data-test='profileSaveSuccess'
        )
          i.icon-check
          i18n Profile saved successfully!

        p.error(v-if='ephemeral.errorMsg') {{ ephemeral.errorMsg }}

        .avatar(:class='{ error: $v.form.picture.$error }')
          label(for='profilePicture')
            avatar(
              :src='userPictureInitial'
              ref='picture'
            )
            i18n.link Change avatar

          input.profilePictureInput#profilePicture(
            type='file'
            name='profilePicture'
            accept='image/*'
            @change='fileChange($event.target.files)'
            placeholder='http://'
            data-test='profilePicture'
          )

          i18n.error(tag='p' v-if='$v.form.picture.$error')
            | The profile picture must be a valid url

        .field
          i18n.label(tag='label') Display Name

          input.input(
            name='displayName'
            type='text'
            v-model='form.displayName'
            placeholder='Name'
            data-test='displayName'
          )

          i18n.help(tag='p') This is how others will see your name accross the platform.

        .field
          i18n.label(tag='label') Bio

          textarea.textarea(
            type='text'
            name='bio'
            v-model='form.bio'
            placeholder='Bio'
            data-test='bio'
          )

        .field
          i18n.label(tag='label') Email

          input.input(
            :class='{error: $v.form.email.$error}'
            name='profileEmail'
            type='text'
            v-model='form.email'
            @input='$v.form.email.$touch()'
            placeholder='Email'
            data-test='profileEmail'
          )

          i18n.error(tag='p' v-if='$v.form.email.$error') Not an email

        .field
          i18n.label Password
          .fake-password(aria-hidden='true') **********

          i18n.link(
            tag='button'
            data-test='passwordBtn'
            @click.prevent='openModal("PasswordModal")'
          ) Update Password

        .buttons
          i18n.is-success(
            tag='button'
            :disabled='$v.form.$invalid'
            type='submit'
            data-test='saveAccount'
          ) Save account changes

    section.card
      form(
        ref='DeleteProfileForm'
        name='DeleteProfileForm'
        @submit.prevent='save'
      )
        i18n(tag='h3' class='card-header') Delete account
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
import { email } from 'vuelidate/lib/validators'
import { OPEN_MODAL } from '@utils/events.js'
import { cloneDeep } from '@utils/giLodash.js'
import imageUpload from '@utils/imageUpload.js'
import Avatar from '@components/Avatar.vue'
import sbp from '~/shared/sbp.js'
import L from '@view-utils/translations.js'

export default {
  name: 'UserProfile',
  mixins: [validationMixin],
  components: {
    Avatar
  },
  data () {
    // create a copy of the attributes to avoid any Vue.js reactivity weirdness
    // so that we do not directly modify the values in the store
    const attrsCopy = cloneDeep(this.$store.getters.currentUserIdentityContract.attributes || {})
    return {
      form: {
        picture: attrsCopy.picture,
        bio: attrsCopy.bio,
        displayName: attrsCopy.displayName,
        email: attrsCopy.email
      },
      ephemeral: {
        errorMsg: null,
        newPicture: false,
        profileSaved: false
      }
    }
  },
  validations: {
    form: {
      picture: {},
      email: { email }
    }
  },
  computed: {
    attributes () {
      return this.$store.getters.currentUserIdentityContract.attributes || {}
    },
    userPictureInitial () {
      return this.attributes.picture
    },
    userName () {
      return this.$store.state.loggedIn.username
    }
  },
  methods: {
    openModal (mode) {
      sbp('okTurtles.events/emit', OPEN_MODAL, mode)
      return false
    },
    async save () {
      if (this.ephemeral.newPicture) {
        try {
          this.form.picture = await imageUpload(this.form.picture)
          this.ephemeral.newPicture = false
        } catch (error) {
          console.error(error)
          this.ephemeral.errorMsg = L('Failed to upload user picture')
          return false
        }
      }

      try {
        this.ephemeral.profileSaved = false
        const attrs = {}
        for (const key in this.form) {
          if (this.form[key] !== this.attributes[key]) {
            attrs[key] = this.form[key]
          }
        }
        const attributes = await sbp('gi.contracts/identity/setAttributes/create',
          attrs,
          this.$store.state.loggedIn.identityContractID
        )
        await sbp('backend/publishLogEntry', attributes)
        this.ephemeral.profileSaved = true
      } catch (ex) {
        // TODO: handle better
        console.error(ex)
        this.ephemeral.errorMsg = L('Failed to Save Profile')
      }
    },
    fileChange (fileList) {
      if (!fileList.length) return
      this.form.picture = fileList[0]
      this.ephemeral.newPicture = true
      this.$refs.picture.setFromBlob(fileList[0])
    }
  }
}
</script>

<style lang='scss' scoped>
@import "../../../assets/style/_variables.scss";

.username {
  display: none;
  margin-bottom: $spacer-lg;
  margin-top: $spacer-sm;
  color: $text_1;

  @include tablet {
    display: block;
  }
}

.avatar {
  margin: 24px auto 20px auto;
  text-align: center;

  .link {
    display: inline-block;
    margin-top: 7px;

    @include widescreen {
      display: block;
      margin-top: 0;
    }
  }

  img {
    display: block;
    width: 113px;
    height: 113px;
    margin: 0 auto;

    @include tablet {
      width: 71px;
      height: 71px;
    }
  }

  @include widescreen {
    position: absolute;
    right: 0;
    top: -58px;
    margin: 0;
  }
}

.profilePictureInput {
  display: none;
}

.fake-password {
  display: inline-block;
  margin-top: $spacer-sm;
  margin-left: -1px;
  margin-right: $spacer-sm;
}

.legend {
  font-size: $size-5;
  font-weight: bold;
  padding-top: 5px;
  padding-bottom: 5px;
}

.icon-check {
  margin-right: 1rem;
}

</style>
