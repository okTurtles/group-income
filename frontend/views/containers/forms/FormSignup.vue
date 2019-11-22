<template lang='pug'>
form(
  novalidate
  name='formData'
  data-test='signup'
  @submit.prevent='signup'
)
  label.field
    i18n.label Username
    input.input(
      :class='{error: $v.form.name.$error}'
      name='name'
      @input='e => debounceValidation("name", e.target.value)'
      @blur='e => updateField("name", e.target.value)'
      data-test='signName'
      v-error:name='{ attrs: { "data-test": "badUsername" } }'
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
      data-test='signEmail'
      v-error:email='{ attrs: { "data-test": "badEmail" } }'
    )

  form-password(:label='L("Password")' name='password' :$v='$v')

  feedback-banner(ref='formFeedback')

  .buttons.is-centered
    i18n.is-primary(
      tag='button'
      type='submit'
      :disabled='$v.form.$invalid'
      data-test='signSubmit'
    ) Create an account
</template>

<script>
import { required, minLength, email } from 'vuelidate/lib/validators'
import { validationMixin } from 'vuelidate'
import sbp from '~/shared/sbp.js'
import { nonWhitespace } from '@views/utils/validators.js'
import ModalTemplate from '@components/Modal/ModalTemplate.vue'
import FormPassword from '@containers/forms/FormPassword.vue'
import FeedbackBanner from '@components/FeedbackBanner.vue'
import L from '@view-utils/translations.js'
import validationsDebouncedMixins from '@view-utils/validationsDebouncedMixins.js'

export default {
  name: 'FormSignup',
  mixins: [
    validationMixin,
    validationsDebouncedMixins
  ],
  components: {
    ModalTemplate,
    FormPassword,
    FeedbackBanner
  },
  data () {
    return {
      form: {
        name: null,
        password: null,
        email: null
      }
    }
  },
  methods: {
    async signup () {
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
          this.$emit('submitSucceeded')
        } catch (error) {
          console.error('Signup.vue submit() error:', error)
          sbp('state/vuex/dispatch', 'logout')
          this.$refs.formFeedback.danger(`${L('Something went wrong, please try again.')} ${error.message}`)
        }
      }
    }
  },
  validations: {
    form: {
      name: {
        [L('A username is required.')]: required,
        [L('A username cannot contain spaces.')]: nonWhitespace,
        [L('This username is already being used.')]: async (value) => {
          return !await sbp('namespace/lookup', value)
        }
      },
      password: {
        [L('A password is required.')]: required,
        [L('Your password must be at least 7 characteres long.')]: minLength(7)
      },
      email: {
        [L('An email is required.')]: required,
        [L('Please enter a valid email.')]: email,
        [L('This email is already being used.')]: value => {
          // TODO - verify if e-mail exists
          return true
        }
      }
    }
  }
}
</script>
