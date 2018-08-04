<template>
  <div class="is-small">
    <modal-header>
      <i18n>Log In</i18n>
    </modal-header>

    <modal-body>
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
    </modal-body>

    <modal-footer :submitError="form.response">
      <button
        class="button is-primary"
        :disabled="$v.form.$invalid"
        data-test="loginSubmit"
        @click="login"
      >
        <span class="icon"><i class="fa fa-user"></i></span>
        <i18n>Login</i18n>
      </button>
      <template slot="footer">
        <a @click="showSignUpModal"><i18n>Don't have an account?</i18n></a>
      </template>
    </modal-footer>
  </div>
</template>
<script>
import { validationMixin } from 'vuelidate'
import { required, minLength } from 'vuelidate/lib/validators'
import sbp from '../../../../shared/sbp.js'
import L from '../utils/translations.js'
import { OPEN_MODAL, CLOSE_MODAL } from '../../utils/events.js'
import ModalHeader from '../components/Modal/ModalHeader.vue'
import ModalBody from '../components/Modal/ModalBody.vue'
import ModalFooter from '../components/Modal/ModalFooter.vue'
import SignUp from './SignUp.vue'

export default {
  name: 'LoginModal',
  mixins: [ validationMixin ],
  components: {
    ModalHeader,
    ModalBody,
    ModalFooter
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
        await this.$store.dispatch('login', {name: this.form.name, identityContractId})
        this.close()
        this.$router.push({path: '/'})
      } catch (error) {
        this.form.response = L('Invalid username or password')
        console.error(error)
      }
    },
    close () {
      sbp('okTurtles.events/emit', CLOSE_MODAL)
    },
    showSignUpModal () {
      sbp('okTurtles.events/emit', OPEN_MODAL, SignUp)
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
