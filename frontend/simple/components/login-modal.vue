<template>
  <div class="modal is-active" ref="modal" id="LoginModal">
    <div class="modal-background" @click="close"></div>
    <div class="modal-content" style="width: 300px">
      <div class="card is-rounded">
        <div class="card-content">
          <h1 class="title"><i18n>Log In</i18n></h1>
          <div class="field">
            <p class="control has-icon">
              <input
                autofocus
                class="input"
                data-vv-rules="required|regex:^\S+$"
                ref="username"
                id="LoginName"
                name="name"
                placeholder="username"
                required
                v-model="name"
                v-validate
                @keyup.enter="login"
              >
              <span class="icon">
                <i class="fa fa-user"></i>
              </span>
            </p>
            <i18n v-show="errors.has('name')" class="help is-danger">Username cannot contain spaces</i18n>
          </div>
          <div class="field">
            <p class="control has-icon">
              <input
                class="input"
                data-vv-rules="required|min:7"
                id="LoginPassword"
                name="password"
                placeholder="password"
                required
                type="password"
                v-model="password"
                v-validate
                @keyup.enter="login"
              >
              <span class="icon"><i class="fa fa-lock"></i></span>
            </p>
            <i18n v-show="errors.has('password')" class="help is-danger">Password must be at least 7 characters</i18n>
          </div>
          <p class="help is-danger" id="LoginResponse" v-show="response">{{ response }}</p>
          <div class="field">
            <p class="control">
              <button
                class="button is-primary is-medium is-fullwidth"
                @click="login"
                :disabled="errors.any()"
                id="LoginButton"
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
import {HapiNamespace} from '../js/backend/hapi'
import L from '../js/translations'

const namespace = new HapiNamespace()

export default {
  name: 'LoginModal',
  inserted () {
    this.$refs.username.focus()
  },
  methods: {
    async login () {
      try {
        // TODO: Insert cryptography here
        const identityContractId = await namespace.lookup(this.name)
        console.log(`Retrieved identity ${identityContractId}`)
        await this.$store.dispatch('login', {name: this.name, identityContractId})
        this.close()
        this.$router.push({path: '/'})
      } catch (error) {
        this.response = L('Invalid username or password')
        console.error(error)
      }
    },
    close () {
      this.$emit('close')
    }
  },
  data () {
    return {
      name: null,
      password: null,
      response: null
    }
  }
}
</script>
