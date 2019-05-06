<template lang='pug'>
  form(
    novalidate
    ref='form'
    name='formData'
    data-test='signup'
    @submit.prevent='signup'
  )
    modal-template(class="is-centered")
      template(slot='title')
        i18n Sign Up

      .field
        p.control.has-icon
          input#name.input(
            :class="{'is-danger': $v.form.name.$error}"
            name='name'
            @input='debounceName'
            placeholder='username'
            ref='username'
            v-focus=''
            data-test='signName'
          )
          span.icon
            i.fa.fa-user

        p.help.is-danger(
          v-if='$v.form.name.$error'
          data-test='badUsername'
        )
          i18n(v-if='!$v.form.name.isAvailable') name is unavailable
          i18n(v-if='!$v.form.name.nonWhitespace') cannot contain spaces

      .field
        p.control.has-icon
          input#email.input(
            :class="{'is-danger': $v.form.email.$error}"
            name='email'
            v-model='form.email'
            @blur='$v.form.email.$touch()'
            type='email'
            placeholder='email'
            data-test='signEmail'
          )
          span.icon
            i.fa.fa-envelope
        i18n.help.is-danger(v-if='$v.form.email.$error' data-test='badEmail') not an email

      form-password(
        :value='form'
        :v='$v.form'
        @input='(newPassword) => {password = newPassword}'
      )

      template(slot='errors') {{ form.response }}

      template(slot='buttons')
        button.button.is-primary.is-centered(
          type='submit'
          :disabled='$v.form.$invalid'
          data-test='signSubmit'
        )
          i18n Create account

      template(slot='footer')
        p
          i18n Already have an account?
          a(@click='showLoginModal')
            i18n Login
</template>
<script>
import { required, minLength, email } from 'vuelidate/lib/validators'
import { validationMixin } from 'vuelidate'
import { debounce } from '@utils/giLodash.js'
import { LOAD_MODAL, CLOSE_MODAL } from '@utils/events.js'
import sbp from '~/shared/sbp.js'
import { nonWhitespace } from '@views/utils/validators.js'
import ModalTemplate from '@components/Modal/ModalTemplate.vue'
import FormPassword from '@components/Forms/Password.vue'

// TODO: fix all this
export default {
  name: 'SignUpModal',
  mixins: [ validationMixin ],
  components: {
    ModalTemplate,
    FormPassword
  },
  data () {
    return {
      form: {
        name: null,
        password: null,
        email: null,
        response: '',
        error: false
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
          let user = sbp('gi/contract/create', 'IdentityContract', {
            // authorizations: [Events.CanModifyAuths.dummyAuth()],
            attributes: {
              name: this.form.name,
              email: this.form.email,
              picture: `${window.location.origin}/assets/images/default-avatar.png`
            }
          })
          let mailbox = sbp('gi/contract/create', 'MailboxContract', {
            // authorizations: [Events.CanModifyAuths.dummyAuth(user.hash())]
          })
          await sbp('backend/publishLogEntry', user)
          await sbp('backend/publishLogEntry', mailbox)

          // set the attribute *after* publishing the identity contract
          let attribute = await sbp('gi/contract/create-action', 'IdentitySetAttributes',
            { mailbox: mailbox.hash() },
            user.hash()
          )
          await sbp('backend/publishLogEntry', attribute)
          // register our username if contract creation worked out
          await sbp('namespace/register', this.form.name, user.hash())
          // call syncContractWithServer on all of these contracts to:
          // 1. begin monitoring the contracts for updates via the pubsub system
          // 2. add these contracts to our vuex state
          for (let contract of [user, mailbox]) {
            await this.$store.dispatch('syncContractWithServer', contract.hash())
          }
          // TODO: Just add cryptographic magic
          // TODO: login also calls 'syncContractWithServer', this is duplication!
          await this.$store.dispatch('login', {
            name: this.form.name,
            identityContractId: user.hash()
          })
          this.form.response = 'success' // TODO: get rid of this and fix/update tests accordingly
          if (this.$route.query.next) {
            // TODO: get rid of this timeout and fix/update tests accordingly
            setTimeout(() => {
              this.$router.push({ path: this.$route.query.next })
            }, 1000)
          } else {
            this.$router.push({ path: '/' })
          }
          sbp('okTurtles.events/emit', CLOSE_MODAL)
        } catch (ex) {
          this.$store.dispatch('logout')
          this.form.response = ex.toString()
          this.form.error = true
        }
      }
    },
    showLoginModal () {
      sbp('okTurtles.events/emit', LOAD_MODAL, 'LoginModal')
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
        email
      }
    }
  }
}
</script>
