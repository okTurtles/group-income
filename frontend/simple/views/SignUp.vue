<template>
  <section class="section">
    <!-- main containers:
     .container  http://bulma.io/documentation/layout/container/
     .content    http://bulma.io/documentation/elements/content/
     .section    http://bulma.io/documentation/layout/section/
     .block      base/classes.sass (just adds 20px margin-bottom except for last)
     -->
    <form novalidate v-form hook="formHook"
      name="formData" class="container signup"
      @submit.prevent="submit"
    >
      <div class="columns is-gapless">
        <div class="column is-hidden-mobile"></div>
        <div class="column is-10">
          <div class="box centered" style="max-width:400px">
            <h2 class="subtitle">Sign Up</h2>

            <p class="control has-icon">
              <input v-form-ctrl class="input" name="name" pattern="\S*" placeholder="username" required>
              <i class="fa fa-user"></i>
              <span v-if="formData.name.$error.pattern" class="help is-danger">Username cannot contain spaces</span>
            </p>
            <p class="control has-icon">
              <input v-form-ctrl class="input" name="email" type="email" placeholder="email" required>
              <i class="fa fa-envelope"></i>
              <span v-if="formData.email.$error.email" class="help is-danger">Not an email</span>
            </p>
            <p class="control has-icon">
              <input v-form-ctrl class="input" name="password" placeholder="password" type="password" required>
              <i class="fa fa-lock"></i>
            </p>
            <div class="level is-mobile top-align">
              <div class="level-item" style="padding-right:5px">
                <span id="serverMsg" class="help is-marginless" :class="[error ? 'is-danger' : 'is-success']">
                  {{ response }}
                </span>
              </div>
              <div class="level-item is-narrow">
                <button class="button submit is-success" type="submit" :disabled="disabledForm">
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
import {loginLogout} from '../js/mixins'
var serialize = require('form-serialize')
var request = require('superagent')

export default {
  name: 'SignUp',
  mixins: [loginLogout],
  methods: {
    submit: function () {
    console.log('') //TODO Debug
      this.response = ''
      request.post(`${process.env.API_URL}/user/`)
      .send(serialize(this.form, {hash: true}))
      .end((err, res) => {
        this.error = !!err || !res.ok
        console.log('this.error', this.error)
        this.response = this.error ? res.body.message : (res.text === '' ? 'success' : res.text)
        if (!this.error && this.$route.query.next) {
          this.login()
          this.$route.router.push({path: this.$route.query.next})
        }
      })
    },
    // TODO: put all this into vue-form; see:
    //       https://github.com/okTurtles/group-income-simple/issues/95
    formHook: function (form) {
      this.form = form.el
      var untouched = this.untouched
      // https://developer.mozilla.org/en-US/docs/Web/API/EventTarget/addEventListener#Memory_issues
      function handleEvent (e) {
        // console.log('handleEvent:', e.target.name)
        // form.controls[e.target.name].directive.update($(e.target).val())
        var el = e.target
        if (el.required && untouched.length > 0) {
          var index = untouched.indexOf(el.name)
          index > -1 && untouched.splice(index, 1)
        }
        form.controls[el.name].directive.update(el.value)
      }
      Vue.nextTick(() => {
        Object.values(form.controls).forEach((ctrl) => {
          // console.log('adding listener to:', ctrl)
          ctrl.el.required && untouched.push(ctrl.el.name)
          ctrl.el.addEventListener('input', handleEvent)
          this.$on('hook:beforeDestroy', () => {
            // console.log('DEBUG: removing  listener for:', ctrl.name)
            ctrl.el.removeEventListener('input', handleEvent)
          })
        })
      })
    }
  },
  computed: {
    disabledForm: function () {
      return this.untouched.length > 0 || this.formData.$invalid
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
