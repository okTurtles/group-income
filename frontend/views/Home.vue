<template>
    <main class="c-splash has-text-centered">
      <div data-test="homeLogo">
        <img class="logo" src="/assets/images/group-income-icon-transparent.png">
        <br>
        <h1 class="title is-3"><i18n>Welcome to GroupIncome</i18n></h1>
        <div v-if="!$store.state.loggedIn" class="c-actions">
          <button @click="showLoginModal" class="button" data-test="loginBtn">
            <i18n>Login</i18n>
          </button>
          <button class="button is-primary" data-test="signupBtn" autofocus
            @click="showSignUpModal"
            @keyup.enter="showSignUpModal">
            <i18n>Signup</i18n>
          </button>
        </div>
        <div v-else>
          <router-link
            class="button is-large is-primary"
            data-test="createGroup"
            to="new-group"
          >
            <i18n>Start a Group</i18n>
          </router-link>
        </div>
      </div>

      <!-- TODO: Let's leave login-modal here Until we decide how to approach Modals logic -->
      <!-- <login-modal
        v-if="loginModalVisible"
        @close="closeLoginModal"
      /> -->
    </main>
</template>
<style scoped lang="scss">
@import "../assets/sass/theme/index";

.c-splash {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  justify-content: center;
}

.title {
  margin-top: 3rem;
}

.logo {
  width: 10rem;
}

.c-actions {
  margin-bottom: $gi-spacer-lg;
}
</style>
<script>
import sbp from '../../shared/sbp.js'
import { LOAD_MODAL } from '../utils/events'

export default {
  name: 'Home',
  mounted () {
    if (this.$route.query.next) {
      this.showLoginModal()
    }
  },
  methods: {
    showLoginModal () {
      sbp('okTurtles.events/emit', LOAD_MODAL, 'LoginModal')
    },
    showSignUpModal () {
      sbp('okTurtles.events/emit', LOAD_MODAL, 'SignUp')
    }
  }
}
</script>
