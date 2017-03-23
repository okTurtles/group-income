<template>
  <section class="section full-screen">
    <!-- main containers:
     .container  http://bulma.io/documentation/layout/container/
     .content    http://bulma.io/documentation/elements/content/
     .section    http://bulma.io/documentation/layout/section/
     .block      base/classes.sass (just adds 20px margin-bottom except for last)
     -->
    <form novalidate ref="form"
      name="formData" class="container signup"
      @submit.prevent="submit"
    >
      <div class="columns is-gapless">
        <div class="column is-hidden-mobile"></div>
        <div class="column is-10">
          <div class="box centered" style="max-width:400px">
            <h2 class="subtitle"><i18n>Sign Up</i18n></h2>

            <a v-on:click="forwardToLogin" style="margin-left: 65%"><i18n>Have an account?</i18n></a>
            <p class="control has-icon">
              <input id="name" class="input" name="name" v-model="name" v-on:keypress="checkName" v-validate data-vv-rules="required|regex:^\S+$" placeholder="username" required>
              <span class="icon is-small">
                <i class="fa fa-user"></i>
              </span>
              <span v-if="errors.has('name')" id="badUsername" class="help is-danger"><i18n>Username cannot contain spaces</i18n></span>
              <span v-show="nameAvailable != null && !errors.has('name') " class="help" v-bind:class="[nameAvailable ? 'is-success' : 'is-danger']">{{ nameAvailable ? 'name is available' : 'name is unavailable' }}</span>
            </p>
            <p class="control has-icon">
              <input class="input" id= "email" name="email" v-model="email" v-validate data-vv-rules="required|email" type="email" placeholder="email" required>
              <span class="icon is-small">
                <i class="fa fa-envelope"></i>
              </span>
              <span v-if="errors.has('email')" id="badEmail" class="help is-danger"><i18n>Not an email</i18n></span>
            </p>
            <p class="control has-icon">
              <input class="input" id="password" name="password" v-model="password" v-validate data-vv-rules="required|min:7" placeholder="password" type="password" required>
              <span v-if="errors.has('password')" id="badPassword" class="help is-danger"><i18n>Password must be at least 7 characters</i18n></span>
              <span class="icon is-small">
                <i class="fa fa-lock"></i>
              </span>
            </p>
            <div class="level is-mobile top-align">
              <div class="level-item" style="padding-right:5px">
                <span id="serverMsg" class="help is-marginless" :class="[error ? 'is-danger' : 'is-success']">
                  {{ response }}
                </span>
              </div>
              <div class="level-item is-narrow">
                <button class="button submit is-success" type="submit" :disabled="errors.any() || !fields.passed()">
                  <i18n>Sign Up</i18n>
                </button>
              </div>
            </div>
          </div>
        </div>
        <div class="column"></div>
      </div>
      <input type="hidden" name="contriGL" value="0">
      <input type="hidden" name="contriRL" value="0">
    </form>
  </section>
</template>

<style>
.signup .level-item { margin-top: 10px; }
.signup .level.top-align { align-items: flex-start; }
</style>

<script>
import backend from '../js/backend'
import Vue from 'vue'
import _ from 'lodash'
import * as Events from '../../../shared/events'
import {HapiNamespace} from '../js/backend/hapi'
var namespace = new HapiNamespace()
// TODO: fix all this
export default {
  name: 'SignUp',
  methods: {
    submit: async function () {
      try {
        // Do this mutation first in order to have events correctly save
        this.$store.commit('login', this.name)
        let user = new Events.IdentityContract({
          authorizations: [Events.CanModifyAuths.dummyAuth()],
          attributes: [
            {name: 'name', value: this.name},
            {name: 'email', value: this.email}
          ]
        })
        await backend.subscribe(user.toHash())
        await backend.publishLogEntry(user.toHash(), user)
        let mailbox = new Events.MailboxContract({
          authorizations: [Events.CanModifyAuths.dummyAuth(user.toHash())]
        })
        await backend.subscribe(mailbox.toHash())
        await backend.publishLogEntry(mailbox.toHash(), mailbox)
        let attribute = new Events.SetAttribute({attribute: {name: 'mailbox', value: mailbox.toHash()}}, user.toHash())
        await backend.publishLogEntry(user.toHash(), attribute)
        await namespace.register(this.name, user.toHash())
        // TODO Just add cryptographic magic
        this.response = 'success'
        if (this.$route.query.next) {
          setTimeout(() => {
            this.$router.push({path: this.$route.query.next})
          }, 1000)
        }
        this.$store.dispatch('login', this.name)
        // await backend.subscribe(mailbox.toHash())
        // await backend.subscribe(mailbox.toHash())
        this.error = false
      } catch (ex) {
        this.$store.commit('logout')
        console.log(ex)
        this.response = ex.toString()
        this.error = true
      }
    },
    forwardToLogin: function () {
      Vue.events.$emit('loginModal')
    },
    checkName: _.debounce(async function () {
      if (this.name && !this.errors.has('name')) {
        try {
          await namespace.lookup(this.name)
          this.nameAvailable = false
        } catch (ex) {
          this.nameAvailable = true
        }
        return this.nameAvailable
      }
    }, 700, {maxWait: 2000})
  },
  data () {
    return {
      error: false,
      response: '',
      nameAvailable: null,
      name: null,
      password: null,
      email: null
    }
  }
}
</script>
