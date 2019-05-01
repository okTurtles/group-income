<template>
    <main class="c-splash has-text-centered">
      <div data-test="homeLogo">
        <img class="logo" src="/assets/images/group-income-icon-transparent.png">
        <br>
        <h1 class="title is-3"><i18n>Welcome to GroupIncome</i18n></h1>
        <div v-if="!$store.state.loggedIn" class="c-actions">
          <button  class="button" data-test="loginBtn"
            ref="loginBtn"
            @click="openModal('LoginModal')"
            :disabled="isModalOpen">
            <i18n>Login</i18n>
          </button>
          <button class="button is-primary" data-test="signupBtn"
            ref="signupBtn"
            @click="openModal('SignUp')"
            @keyup.enter="openModal('SignUp')" :disabled="isModalOpen">
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
import { LOAD_MODAL, UNLOAD_MODAL } from '../utils/events'

export default {
  name: 'Home',
  data () {
    return {
      isModalOpen: false,
      lastFocus: 'signupBtn'
    }
  },
  mounted () {
    if (this.$route.query.next) {
      this.openModal('LoginModal')
    } else {
      if (!this.$store.state.loggedIn) {
        sbp('okTurtles.events/on', UNLOAD_MODAL, this.enableSubmit)
        this.enableSubmit()
        // Fix firefox autofocus
        process.nextTick(() => this.$refs[this.lastFocus].focus())
      }
    }
  },
  beforeDestroy () {
    sbp('okTurtles.events/off', UNLOAD_MODAL, this.enableSubmit)
  },
  methods: {
    openModal (mode) {
      this.isModalOpen = true
      // Keep track of user last action
      this.lastFocus = mode === 'SignUp' ? 'signupBtn' : 'loginBtn'
      sbp('okTurtles.events/emit', LOAD_MODAL, mode)
    },
    enableSubmit () {
      this.isModalOpen = false
      if (!this.$store.state.loggedIn) {
        // Enable focus on button and fix for firefox
        this.$nextTick(() => this.$refs[this.lastFocus].focus())
      }
    }
  }
}
</script>
