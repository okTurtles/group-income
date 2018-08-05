<template>
    <section class="section full-screen has-text-centered">
      <div data-test="homeLogo">
        <img class="logo" src="assets/images/group-income-icon-transparent.png">
        <br>
        <h1 class="title is-3"><i18n>Welcome to GroupIncome</i18n></h1>
        <div v-if="!$store.state.loggedIn">
          <a v-on:click="showLoginModal"><i18n>Login</i18n></a> or <a @click="showSignUpModal"><i18n>Sign Up</i18n></a> <i18n>to continue</i18n>
        </div>
        <div v-else>
          <router-link
            class="button is-success"
            data-test="createGroup"
            to="new-group"
          >
            <i18n>Start a Group</i18n>
          </router-link>
        </div>
      </div>
    </section>
</template>
<style scoped>
  .logo,
  .title {
    margin-top: 3rem;
  }

  .logo {
    width: 160px;
  }
</style>
<script>
import '../controller/router.js'
import sbp from '../../../shared/sbp.js'
import LoginModal from './containers/LoginModal.vue'
import SignUp from './containers/SignUp.vue'
import { OPEN_MODAL } from '../utils/events'

export default {
  name: 'Home',
  mounted () {
    if (this.$route.query.next) {
      this.showLoginModal()
    }
  },
  methods: {
    showLoginModal () {
      sbp('okTurtles.events/emit', OPEN_MODAL, LoginModal)
    },
    showSignUpModal () {
      sbp('okTurtles.events/emit', OPEN_MODAL, SignUp)
    }
  }
}
</script>
