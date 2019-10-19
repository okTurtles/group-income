<template lang='pug'>
  modal-template(class='has-background' ref='modal')
    template(slot='title')
      i18n Sign Up

    form(
      novalidate
      ref='form'
      name='formData'
      data-test='signup'
      @submit.prevent='signup'
    )
      label.field
        i18n.label Username
        input.input#name(
          :class='{error: $v.form.name.$error}'
          name='name'
          @input='debounceName'
          ref='username'
          data-test='signName'
        )
        //- can't use v-error here because it doesn't support
        //- asynchronous validation failures
        p.error(v-if='$v.form.name.$error' data-test='badUsername')
          i18n(v-if='!$v.form.name.isAvailable') name is unavailable
          i18n(v-if='!$v.form.name.nonWhitespace') cannot contain spaces

      label.field
        i18n.label Email
        input.input#email(
          :class='{error: $v.form.email.$error}'
          name='email'
          v-model='$v.form.email.$model'
          type='email'
          data-test='signEmail'
          v-error:email='{ tag: "p", attrs: { "data-test": "badEmail" } }'
        )

      form-password(
        :label='L("Password")'
        :value='form'
        :v='$v.form'
        @input='(newPassword) => {password = newPassword}'
      )

      p.error(v-if='ephemeral.errorMsg') {{ ephemeral.errorMsg }}

      .buttons.is-centered
        i18n.is-primary.is-centered(
          tag='button'
          type='submit'
          :disabled='$v.form.$invalid'
          data-test='signSubmit'
        ) Create account

    template(slot='footer')
      p
        i18n Already have an account?&nbsp;
        a.link(@click='showLoginModal' data-test='goToLogin')
          i18n Login
</template>

<script>
import { required, minLength, email } from 'vuelidate/lib/validators'
import { validationMixin } from 'vuelidate'
import { debounce } from '@utils/giLodash.js'
import { REPLACE_MODAL } from '@utils/events.js'
import sbp from '~/shared/sbp.js'
import { nonWhitespace } from '@views/utils/validators.js'
import ModalTemplate from '@components/Modal/ModalTemplate.vue'
import FormPassword from '@components/Forms/Password.vue'
import L from '@view-utils/translations.js'

// TODO: fix all this
export default {
  name: 'SignUpModal',
  mixins: [validationMixin],
  components: {
    ModalTemplate,
    FormPassword
  },
  data () {
    return {
      form: {
        name: null,
        password: null,
        email: null
      },
      ephemeral: {
        errorMsg: null
      }
    }
  },
  methods: {
    debounceName: debounce(function (e) {
      // "Validator is evaluated on every data change, as it is essentially a computed value.
      // If you need to throttle an async call, do it on your data change event, not on the validator itself.
      // You may end up with broken Vue observables otherwise."
      this.form.name = e.target.value
      this.$v.form.name.$touch()
    }, 700),
    signup: async function () {
      // Prevent autocomplete submission when empty field
      if (this.form.name !== null && this.form.email !== null) {
        try {
          // TODO: make sure we namespace these names:
          //       https://github.com/okTurtles/group-income-simple/issues/598
          const oldSettings = await sbp('gi.db/settings/load', this.form.name)
          if (oldSettings) {
            // TODO: prompt to ask user before deleting and overwriting an existing user
            //       https://github.com/okTurtles/group-income-simple/issues/599
            console.warn(`deleting settings for pre-existing user ${this.form.name}!`, oldSettings)
            await sbp('gi.db/settings/delete', this.form.name)
          }
          // proceed with creation
          const user = sbp('gi.contracts/identity/create', {
            // authorizations: [Events.CanModifyAuths.dummyAuth()],
            attributes: {
              name: this.form.name,
              email: this.form.email,
              picture: `${window.location.origin}/assets/images/default-avatar.png`
            }
          })
          const mailbox = sbp('gi.contracts/mailbox/create', {
            // authorizations: [Events.CanModifyAuths.dummyAuth(user.hash())]
          })
          await sbp('backend/publishLogEntry', user)
          await sbp('backend/publishLogEntry', mailbox)

          // set the attribute *after* publishing the identity contract
          const attribute = await sbp('gi.contracts/identity/setAttributes/create',
            { mailbox: mailbox.hash() },
            user.hash()
          )
          await sbp('backend/publishLogEntry', attribute)
          // register our username if contract creation worked out
          await sbp('namespace/register', this.form.name, user.hash())
          // call syncContractWithServer on all of these contracts to:
          // 1. begin monitoring the contracts for updates via the pubsub system
          // 2. add these contracts to our vuex state
          for (const contract of [user, mailbox]) {
            await sbp('state/enqueueContractSync', contract.hash())
          }
          // TODO: Just add cryptographic magic
          // login also calls 'state/enqueueContractSync', but not in this case since we
          // just sync'd it.
          await sbp('state/vuex/dispatch', 'login', {
            username: this.form.name,
            identityContractID: user.hash()
          })
          this.ephemeral.errorMsg = 'success' // TODO: get rid of this and fix/update tests accordingly
          if (this.$route.query.next) {
            // TODO: get rid of this timeout and fix/update tests accordingly
            setTimeout(() => {
              this.$router.push({ path: this.$route.query.next })
            }, 1000)
          } else {
            this.$router.push({ path: '/' })
          }
          this.$refs.modal.close()
        } catch (ex) {
          console.error('SignUp.vue submit() error:', ex)
          sbp('state/vuex/dispatch', 'logout')
          this.ephemeral.errorMsg = ex.toString()
        }
      }
    },
    showLoginModal () {
      sbp('okTurtles.events/emit', REPLACE_MODAL, 'LoginModal')
    }
  },
  validations: {
    form: {
      name: {
        required,
        nonWhitespace,
        isAvailable (value) {
          // standalone validator ideally should not assume a field is required
          if (value === '' || !/^\S+$/.test(value)) return true
          // async validator can return a promise
          // TODO: fix "uncaught exception" errors in console when name is already taken
          return new Promise((resolve, reject) => {
            // we need the opposite of sbp('namespace/lookup', value) here
            sbp('namespace/lookup', value).then(reject, resolve)
          })
        }
      },
      password: {
        required,
        minLength: minLength(7)
      },
      email: {
        required,
        [L('not an e-mail')]: email,
        [L('e-mail is unavailable')]: value => {
          // TODO - verify if e-mail exists
          return true
        }
      }
    }
  }
}
</script>
