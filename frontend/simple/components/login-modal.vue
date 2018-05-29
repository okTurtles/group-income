<template>
  <div class="modal is-active"
    ref="modal"
    data-test="loginModal"
  >
    <div class="modal-background" @click="close"></div>
    <div class="modal-content" style="width: 300px;">
      <div class="card is-rounded">
        <div class="card-content">
          <h1 class="title has-text-centered"><i18n>Log In</i18n></h1>
          <div class="field">
            <p class="control has-icon">
              <input
                id="LoginName"
                class="input"
                :class="{'is-danger': $v.form.name.$error}"
                name="name"
                v-model="form.name"
                @keyup.enter="login"
                @input="$v.form.name.$touch()"
                placeholder="username"
                ref="username"
                autofocus
                data-test="loginName"
              >
              <span class="icon">
                <i class="fa fa-user"></i>
              </span>
            </p>
            <i18n v-show="$v.form.name.$error" class="help is-danger">username cannot contain spaces</i18n>
          </div>
          <div class="field">
            <p class="control has-icon">
              <input
                class="input"
                :class="{'is-danger': $v.form.password.$error}"
                id="LoginPassword"
                name="password"
                v-model="form.password"
                @keyup.enter="login"
                @input="$v.form.password.$touch()"
                placeholder="password"
                type="password"
                data-test="loginPassword"
              >
              <span class="icon"><i class="fa fa-lock"></i></span>
            </p>
            <i18n v-show="$v.form.password.$error" class="help is-danger">password must be at least 7 characters</i18n>
          </div>
          <p class="help is-danger"
            v-show="form.response"
            data-test="loginResponse"
          >
            {{ form.response }}
          </p>
          <div class="field">
            <p class="control">
              <button
                class="button is-primary is-medium is-fullwidth"
                @click="login"
                :disabled="$v.form.$invalid"
                data-test="loginSubmit"
              >
                <span class="icon"><i class="fa fa-user"></i></span>
                <i18n>Login</i18n>
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
    <div class="modal-close" @click="close"></div>
  </div>
</template>
<script>
import {HapiNamespace} from '../controller/backend/hapi'
import L from '../js/translations'
import { validationMixin } from 'vuelidate'
import { required, minLength } from 'vuelidate/lib/validators'

const namespace = new HapiNamespace()

export default {
  name: 'LoginModal',
  mixins: [ validationMixin ],
  inserted () {
    this.$refs.username.focus()
  },
  methods: {
    async login () {
      try {
        // TODO: Insert cryptography here
        const identityContractId = await namespace.lookup(this.form.name)
        console.log(`Retrieved identity ${identityContractId}`)
        await this.$store.dispatch('login', {name: this.form.name, identityContractId})
        this.close()
        this.$router.push({path: '/'})
      } catch (error) {
        this.form.response = L('Invalid username or password')
        console.error(error)
      }
    },
    close () {
      this.$emit('close')
    }
  },
  data () {
    return {
      form: {
        name: null,
        password: null,
        response: null
      }
    }
  },
  validations: {
    form: {
      name: {
        required,
        nonWhitespace: value => /^\S+$/.test(value)
      },
      password: {
        required,
        minLength: minLength(7)
      }
    }
  }
}
</script>
