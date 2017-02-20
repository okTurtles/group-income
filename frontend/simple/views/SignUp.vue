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
            <h2 class="subtitle">Sign Up</h2>

            <a v-on:click="forwardToLogin" style="margin-left: 65%">Have an account?</a>


            <p class="control has-icon">
              <input id="name" class="input" name="name" v-model="name" v-on:keypress="checkName" v-validate data-vv-rules="required|regex:^\S+$" placeholder="username" required>
              <span class="icon is-small">
                <i class="fa fa-user"></i>
              </span>
              <span v-if="errors.has('name')" id="badUsername" class="help is-danger">Username cannot contain spaces</span>
              <span v-show="nameAvailable != null && !errors.has('name') " class="help" v-bind:class="[nameAvailable ? 'is-success' : 'is-danger']">{{ nameAvailable ? 'name is available' : 'name is unavailable' }}</span>
            </p>
            <p class="control has-icon">
              <input class="input" id= "email" name="email" v-model="email" v-validate data-vv-rules="required|email" type="email" placeholder="email" required>
              <span class="icon is-small">
                <i class="fa fa-envelope"></i>
              </span>
              <span v-if="errors.has('email')" id="badEmail" class="help is-danger">Not an email</span>
            </p>
            <p class="control has-icon">
              <input class="input" id="password" name="password" v-model="password" v-validate data-vv-rules="required|min:7" placeholder="password" type="password" required>
              <span v-if="errors.has('password')" id="badPassword" class="help is-danger">Password must be at least 7 characters</span>
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
                  Sign Up
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
        let user = new Events.IdentityContract({
          attributes: [
            {name: 'name', value: this.name},
            {name: 'email', value: this.email}
          ]
        })
        await namespace.register(this.name, user.toHash())
        // TODO Just add cryptographic magic
        this.response = 'success'
        if (this.$route.query.next) {
          setTimeout(() => {
            this.$router.push({path: this.$route.query.next})
          }, 1000)
        }
        this.$store.commit('login', this.name)
        this.error = false
      } catch (ex) {
        console.log(ex)
        this.response = ex.toString()
        this.error = true
      }
    },
    forwardToLogin: function () {
      Vue.events.$emit('login')
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
