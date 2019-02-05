<template>
  <modal class="is-small" :submitError="form.response">
    <template #subtitle>
      <i18n>Log In</i18n>
    </template>

    
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
        <span class="icon"><i class="fas fa-lock"></i></span>
      </p>
      <i18n v-show="$v.form.password.$error" class="help is-danger">password must be at least 7 characters</i18n>
    </div>

    <template #buttons>
      <button
        class="button is-primary"
        :disabled="$v.form.$invalid"
        data-test="loginSubmit"
        @click="login"
      >
        <span class="icon"><i class="fa fa-user"></i></span>
        <i18n>Login</i18n>
      </button>
    </template>

    <template #footer>
      <a @click="showSignUpModal"><i18n>Don't have an account?</i18n></a>
    </template>

  </modal>
</template>
<script>
import sbp from '../../../shared/sbp.js'
import { validationMixin } from 'vuelidate'
import { required, minLength } from 'vuelidate/lib/validators'
import { OPEN_MODAL, CLOSE_MODAL } from '../../utils/events.js'
import Modal from '../components/Modal/Modal.vue'
import L from '../utils/translations.js'

export default {
  name: 'LoginModal',
  mixins: [ validationMixin ],
  components: {
    Modal
  },
  inserted () {
    this.$refs.username.focus()
  },
  methods: {
    async login () {
      try {
        // TODO: Insert cryptography here
        const identityContractId = await sbp('namespace/lookup', this.form.name)
        console.log(`Retrieved identity ${identityContractId}`)
        await this.$store.dispatch('login', { name: this.form.name, identityContractId })
        this.close()
        this.$router.push({ path: '/' })
      } catch (error) {
        this.form.response = L('Invalid username or password')
        console.error(error)
      }
    },
    close () {
      sbp('okTurtles.events/emit', CLOSE_MODAL)
    },
    showSignUpModal () {
      sbp('okTurtles.events/emit', OPEN_MODAL, 'SignUp')
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
