<template>
  <form novalidate ref="form"
    name="formData"
    data-test="signup"
    @submit.prevent="submit">
    <modal-template class="is-small">
      <!-- https://vuejs.org/v2/guide/components-slots.html#Named-Slots-Shorthand -->
      <template #subTitle>
        <i18n>Sign Up</i18n>
      </template>

      <div class="field">
        <p class="control has-icon">
          <input
            id="name"
            class="input"
            :class="{'is-danger': $v.form.name.$error}"
            name="name"
            @input="debounceName"
            placeholder="username"
            ref="username"
            v-focus
            data-test="signName"
          >
          <span class="icon"><i class="fa fa-user"></i></span>
        </p>
        <p class="help is-danger"
          data-test="badUsername"
          v-if="$v.form.name.$error"
        >
          <i18n v-if="!$v.form.name.isAvailable">name is unavailable</i18n>
          <i18n v-if="!$v.form.name.nonWhitespace">cannot contain spaces</i18n>
        </p>
      </div>
      <div class="field">
        <p class="control has-icon">
          <input
            class="input"
            :class="{'is-danger': $v.form.email.$error}"
            id="email"
            name="email"
            v-model="form.email"
            @blur="$v.form.email.$touch()"
            type="email"
            placeholder="email"
            data-test="signEmail"
          >
          <span class="icon"><i class="fa fa-envelope"></i></span>
        </p>
        <i18n v-if="$v.form.email.$error" class="help is-danger" data-test="badEmail">not an email</i18n>
      </div>
      <div class="field">
        <p class="control has-icon">
          <input
            class="input"
            :class="{'is-danger': $v.form.password.$error}"
            id="password"
            name="password"
            v-model="form.password"
            @input="$v.form.password.$touch()"
            placeholder="password"
            type="password"
            data-test="signPassword"
          >
          <span class="icon"><i class="fa fa-lock"></i></span>
        </p>
        <i18n v-if="$v.form.password.$error" class="help is-danger" data-test="badPassword">password must be at least 7 characters</i18n>
      </div>

      <template #errors>
        {{ form.response }}
      </template>

      <template #buttons>
        <button
          class="button is-primary"
          type="submit"
          :disabled="$v.form.$invalid"
          data-test="signSubmit"
        >
          <i18n>Sign Up</i18n>
        </button>
      </template>

      <template #footer>
        <a @click="showLoginModal"><i18n>Have an account?</i18n></a>
      </template>
    </modal-template>
  </form>
</template>
<script>
import ModalTemplate from '../components/Modal/ModalTemplate.vue'
import { debounce } from '../../utils/giLodash.js'
import { validationMixin } from 'vuelidate'
import sbp from '../../../shared/sbp.js'
import { nonWhitespace } from '../utils/validators.js'
import { LOAD_MODAL, CLOSE_MODAL } from '../../utils/events.js'
import { required, minLength, email } from 'vuelidate/lib/validators'

// TODO: fix all this
export default {
  name: 'SignUp',
  mixins: [ validationMixin ],
  components: {
    ModalTemplate
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
    submit: async function () {
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
