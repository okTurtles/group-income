<template lang='pug'>
  .settings-container
    h1.settings-title.is-size-4
      i18n My account

    p.username.is-size-6 {{ userName }}

    section.section
      form(
        ref="ProfileForm"
        name="ProfileForm"
        @submit.prevent="save"
      )
        p.notification.is-success(
          v-if="profileSaved"
          data-test='profileSaveSuccess'
        )
          i.notification-icon.fa.fa-check
          i18n Profile saved successfully!

        p.notification.is-danger(
          v-if="errorMsg"
        )
          i.notification-icon.fa.fa-exclamation-triangle
          | {{errorMsg}}

        .avatar
          avatar(:src="userPicture" size="xl")

        .field
          label.label
            i18n  Profile Picture
          input.input(
            :class="{'is-danger': $v.edited.picture.$error}"
            type='text'
            name='profilePicture'
            v-model='edited.picture'
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
            i18n(v-if="$v.edited.email.$error")
              | Not an email

        .has-text-centered.button-box
          button.button(
            data-test="passwordBtn"
            @click.prevent="openModal('PasswordModal')"
          )
            i18n Update Password

          button.button.is-success.is-large(
            :disabled='$v.edited.$invalid'
            type='submit'
            data-test='submit'
          )
            i18n Save Profile

</template>

<script>
import { validationMixin } from 'vuelidate'
import { email, helpers } from 'vuelidate/lib/validators'
import { LOAD_MODAL } from '../../../utils/events.js'
import Avatar from '../../components/Avatar.vue'
import sbp from '../../../../shared/sbp.js'
import L from '../../utils/translations.js'

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
      return this.$store.getters.currentUserIdentityContract &&
        this.$store.getters.currentUserIdentityContract.attributes &&
        this.$store.getters.currentUserIdentityContract.attributes.picture
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
    }
  }
}
</script>

<style lang='scss' scoped>
@import "../../../assets/sass/theme/index";

.username {
  margin-top: -$gi-spacer;
  margin-bottom: $gi-spacer-lg;
}

.avatar {
  position: absolute;
  right: 0;
  top: 0;
}

</style>
