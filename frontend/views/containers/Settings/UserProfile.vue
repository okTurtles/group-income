<template lang='pug'>
  .settings-container
    p.username.is-size-6 {{ userName }}

    section.section
      form(
        ref='ProfileForm'
        name='ProfileForm'
        @submit.prevent='save'
      )
        fieldset.is-clearfix
          p.notification.is-success(
            v-if='profileSaved'
            data-test='profileSaveSuccess'
          )
            i.notification-icon.fa.fa-check
            i18n Profile saved successfully!

          p.notification.is-danger(
            v-if='errorMsg'
          )
            i.notification-icon.fa.fa-exclamation-triangle
            | {{errorMsg}}

          .avatar(:class="{'is-danger': $v.edited.picture.$error}")
            label(for='profilePicture')
              avatar(:src='userPicture')
              i18n.link Change avatar

            input#profilePicture.profilePictureInput(
              type='file'
              name='profilePicture'
              accept='image/*'
              @change="fileChange($event.target.files)"
              @input='$v.edited.picture.$touch()'
              placeholder='http://'
              data-test='profilePicture'
            )

            p.help.is-danger
              i18n(v-if='$v.edited.picture.$error')
                | The profile picture must be a valid url

          .field
            label.label
              i18n Display Name

            input.input(
              name='displayName'
              type='text'
              v-model='edited.displayName'
              placeholder='Name'
              data-test='displayName'
            )

            p.help
              i18n This is how others will see your name accross the platform.

          .field
            label.label
              i18n Bio

            textarea.textarea(
              type='text'
              name='bio'
              v-model='edited.bio'
              placeholder='Bio'
              data-test='bio'
            )

          .field
            label.label
              i18n Email

            input.input(
              :class="{'is-danger': $v.edited.email.$error}"
              name='profileEmail'
              type='text'
              v-model='edited.email'
              @input='$v.edited.email.$touch()'
              placeholder='Email'
              data-test='profileEmail'
            )

            p.help.is-danger
              i18n(v-if='$v.edited.email.$error')
                | Not an email

          .field
          label.label
            i18n Password

          .fake-password.is-pulled-left **********

          .link.is-pulled-right(
            data-test='passwordBtn'
            @click.prevent="openModal('PasswordModal')"
          )
            i18n Update Password

        .button-box
          button.button.is-success(
            :disabled='$v.edited.$invalid'
            type='submit'
            data-test='submit'
          )
            i18n Save account changes
    hr
    section.section
      form(
        ref='DeleteProfileForm'
        name='DeleteProfileForm'
        @submit.prevent='save'
      )
        legend.legend Delete account
        p
          i18n Deleting your account will erase all your data, and remove you from the groups you belong to.
          i18n.is-danger This action cannot be undone.

        .button-box
          button.button.is-danger.is-outlined(
            type='submit'
            data-test='submit'
          )
            i18n Delete account

</template>

<script>
import { validationMixin } from 'vuelidate'
import { email, helpers } from 'vuelidate/lib/validators'
import { LOAD_MODAL } from '@utils/events.js'
import Avatar from '@components/Avatar.vue'
import sbp from '~/shared/sbp.js'
import L from '~/frontend/views/utils/translations.js'

const url = helpers.regex('url', /^(https?|ftp):\/\/[^\s/$.?#].[^\s]*$/i)

export default {
  name: 'SettingsUserProfile',
  mixins: [ validationMixin ],
  components: {
    Avatar
  },
  data () {
    return {
      edited: {
        picture: this.$store.getters.currentUserIdentityContract.attributes.picture,
        bio: this.$store.getters.currentUserIdentityContract.attributes.bio,
        displayName: this.$store.getters.currentUserIdentityContract.attributes.displayName,
        email: this.$store.getters.currentUserIdentityContract.attributes.email
      },
      errorMsg: null,
      profileSaved: false
    }
  },
  validations: {
    edited: {
      picture: { url },
      email: { email }
    }
  },
  computed: {
    attributes () {
      return this.$store.getters.currentUserIdentityContract.attributes
    },
    userPicture () {
      return this.edited.picture || (this.$store.getters.currentUserIdentityContract &&
        this.$store.getters.currentUserIdentityContract.attributes &&
        this.$store.getters.currentUserIdentityContract.attributes.picture)
    },
    userName () {
      return this.$store.state.loggedIn.name
    }
  },
  methods: {
    openModal (mode) {
      sbp('okTurtles.events/emit', LOAD_MODAL, mode)
      return false
    },
    async save () {
      try {
        this.profileSaved = false
        var attrs = {}
        for (let key of Object.keys(this.edited)) {
          if (this.edited[key] && this.edited[key] !== this.attributes[key]) {
            attrs[key] = this.edited[key]
          }
        }
        let attributes = await sbp('gi/contract/create-action', 'IdentitySetAttributes',
          attrs,
          this.$store.state.loggedIn.identityContractId
        )
        await sbp('backend/publishLogEntry', attributes)
        this.profileSaved = true
      } catch (ex) {
        console.log(ex)
        this.errorMsg = L('Failed to Save Profile')
      }
    },
    fileChange (fileList) {
      if (!fileList.length) return
      // Temp
      this.edited.picture = URL.createObjectURL(fileList[0])
    }
  }
}
</script>

<style lang='scss' scoped>
@import "../../../assets/sass/theme/index";

.username {
  display: none;
  margin-bottom: $gi-spacer-lg;

  @include tablet {
    display: block;
  }
}

.avatar {
  height: 145px;
  margin: 24px auto 20px auto;
  text-align: center;

  .link {
    display: inline-block;
    margin-top: 7px;
    @include tablet {
      display: block;
      margin-top: 0px;
    }
  }

  img {
    display: block;
    width: 113px;
    margin: 0 auto;

    @include tablet {
      width: 71px;
    }
  }

  @include tablet {
    position: absolute;
    right: 0;
    top: -40px;
    margin: 0;
  }
}

.profilePictureInput {
  display: none;
}

.fake-password {
  margin-top: 10px;
  margin-left: -1px;
  letter-spacing: -0.35px;
}

.button-box {
  margin: 34px 0;
}

.legend {
  font-size: 18px;
  font-weight: bold;
  padding-top: 5px;
  padding-bottom: 5px;
}

// TODO confirm button size with
// Default size defined by A11Y
.button {
  font-size: 15px;
  padding: 0 19px;
  font-weight: normal;
  height: 36px;
  min-height: 36px;
  letter-spacing: 0.6px;
}

</style>
