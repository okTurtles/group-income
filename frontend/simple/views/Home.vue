<template>
    <section class="section full-screen has-text-centered">
      <div data-test="homeLogo">
        <img class="logo" src="images/group-income-icon-transparent.png">
        <br>
        <h1 class="title gi-foco-font"><i18n>Welcome to GroupIncome</i18n></h1>
        <div v-if="!$store.state.loggedIn"><a v-on:click="forwardToLogin"><i18n>Login</i18n></a> or <router-link to="signup"><i18n>Sign Up</i18n></router-link> <i18n>to continue</i18n></div>
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
import Vue from 'vue'
export default {
  methods: {
    forwardToLogin: function () {
      Vue.events.$emit('loginModal')
    }
  }
}
</script>
