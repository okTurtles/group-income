<template>
  <section class="section level">
    <form class="signup level-item"
      novalidate ref="form"
      name="formData"
      data-test="signup"
      @submit.prevent="submit"
    >
      <div class="box gi-box">
        <div class="level is-mobile">
          <div class="level-left">
            <div class="level-item">
              <p class="title is-5"><i18n>Sign Up</i18n></p>
            </div>
          </div>
          <div class="level-right">
            <p class="level-item content is-small">
              <a @click="forwardToLogin"><i18n>Have an account?</i18n></a>
            </p>
          </div>
        </div>
        <div class="field">
          <p class="control has-icon">
            <input
              id="name"
              class="input"
              :class="{'is-danger': $v.form.name.$error}"
              name="name"
              @input="debounceName"
              placeholder="username"
              autofocus
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
        <div class="level is-mobile">
          <div class="level-left">
            <div class="level-item content is-small">
              <span class="help is-marginless"
                :class="[form.error ? 'is-danger' : 'is-success']"
                data-test="serverMsg"
              >
                {{form.response}}
              </span>
            </div>
          </div>
          <div class="level-right">
            <div class="level-item is-narrow">
              <button
                class="button submit is-success"
                type="submit"
                :disabled="$v.form.$invalid"
                data-test="signSubmit"
              >
                <i18n>Sign Up</i18n>
              </button>
            </div>
          </div>
        </div>
      </div>
    </form>
  </section>
</template>
<style scoped>
.gi-box {
  width: 25rem;
  max-width: 100%;
}
</style>
<script>
import backend from '../js/backend'
import Vue from 'vue'
import _ from 'lodash'
import * as Events from '../../../shared/events'
import * as contracts from '../js/events'
import {namespace} from '../js/backend/hapi'
import { validationMixin } from 'vuelidate'
import { required, minLength, email } from 'vuelidate/lib/validators'
import { nonWhitespace } from '../js/customValidators'
// TODO: fix all this
export default {
  name: 'SignUp',
  mixins: [ validationMixin ],
  methods: {
    debounceName: _.debounce(function (e) {
      // "Validator is evaluated on every data change, as it is essentially a computed value.
      // If you need to throttle an async call, do it on your data change event, not on the validator itself.
      // You may end up with broken Vue observables otherwise."
      this.form.name = e.target.value
      this.$v.form.name.$touch()
    }, 700),
    submit: async function () {
      try {
        let user = new contracts.IdentityContract({
          authorizations: [Events.CanModifyAuths.dummyAuth()],
          attributes: [
            {name: 'name', value: this.form.name},
            {name: 'email', value: this.form.email},
            {name: 'picture', value: `${window.location.origin}/simple/images/default-avatar.png`}
          ]
        })
        let mailbox = new contracts.MailboxContract({
          authorizations: [Events.CanModifyAuths.dummyAuth(user.toHash())]
        })
        let attribute = new Events.HashableIdentitySetAttribute({
          attribute: {name: 'mailbox', value: mailbox.toHash()}
        }, user.toHash())
        // create these contracts on the server by calling publishLogEntry
        for (let event of [user, mailbox, attribute]) {
          let hash = event.toObject().parentHash || event.toHash()
          await backend.publishLogEntry(hash, event)
        }
        // register our username if contract creation worked out
        await namespace.register(this.form.name, user.toHash())
        // call syncContractWithServer on all of these contracts to:
        // 1. begin monitoring the contracts for updates via the pubsub system
        // 2. add these contracts to our vuex state
        for (let contract of [user, mailbox]) {
          await this.$store.dispatch('syncContractWithServer', contract.toHash())
        }
        // TODO: Just add cryptographic magic
        await this.$store.dispatch('login', {
          name: this.form.name,
          identityContractId: user.toHash()
        })
        this.form.response = 'success' // TODO: get rid of this and fix/update tests accordingly
        if (this.$route.query.next) {
          // TODO: get rid of this timeout and fix/update tests accordingly
          setTimeout(() => {
            this.$router.push({path: this.$route.query.next})
          }, 1000)
        } else {
          this.$router.push({path: '/'})
        }
        this.form.error = false
      } catch (ex) {
        // TODO: this should be done via dispatch
        this.$store.commit('logout')
        console.log(ex)
        this.form.response = ex.toString()
        this.form.error = true
      }
    },
    forwardToLogin: function () {
      Vue.events.$emit('loginModal')
    }
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
  validations: {
    form: {
      name: {
        required,
        nonWhitespace,
        isAvailable (value) {
          // standalone validator ideally should not assume a field is required
          if (value === '' || !/^\S+$/.test(value)) return true
          // async validator can return a promise
          // we need the opposite of namespace.lookup(value) here
          return new Promise((resolve, reject) => {
            namespace.lookup(value).then(reject, resolve)
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
