<template>
  <section class="section">
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

            <p class="control has-icon">
              <input class="input" name="name" v-validate data-rules="required|regex:^\S+$" placeholder="username" required>
              <i class="fa fa-user"></i>
              <span v-show="errors.has('name')" class="help is-danger">Username cannot contain spaces</span>
            </p>
            <p class="control has-icon">
              <input class="input" name="email" v-validate data-rules="required|email" type="email" placeholder="email" required>
              <i class="fa fa-envelope"></i>
              <span v-show="errors.has('email')" class="help is-danger">Not an email</span>
            </p>
            <p class="control has-icon">
              <input class="input" name="password" v-validate data-rules="required|min:7" placeholder="password" type="password" required>
              <span v-show="errors.has('password')" class="help is-danger">Password must be at least 7 characters</span>
              <i class="fa fa-lock"></i>
            </p>
            <div class="level is-mobile top-align">
              <div class="level-item" style="padding-right:5px">
                <span id="serverMsg" class="help is-marginless" :class="[error ? 'is-danger' : 'is-success']">
                  {{ response }}
                </span>
              </div>
              <div class="level-item is-narrow">
                <button class="button submit is-success" type="submit" :disabled="errors.any() || !fields.dirty()">
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
import {loginLogout} from '../js/mixins'
var serialize = require('form-serialize')
var request = require('superagent')

export default {
  name: 'SignUp',
  mixins: [loginLogout],
  methods: {
    submit: function () {
      console.log(this.errors)
      this.response = ''
      request.post(`${process.env.API_URL}/user/`)
      .send(serialize(this.$refs.form, {hash: true}))
      .end((err, res) => {
        this.error = !!err || !res.ok
        console.log('this.error', this.error)
        this.response = this.error ? res.body.message : (res.text === '' ? 'success' : res.text)
        if (!this.error && this.$route.query.next) {
          this.login()
          this.$router.push({path: this.$route.query.next})
        }
      })
    }
  },
  data () {
    return {
      error: false,
      response: '',
      formData: {},
      untouched: []
    }
  }
}
</script>
