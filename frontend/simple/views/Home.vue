<template>
    <section class="section full-screen">
      <div class="centered" style="text-align: center;" data-test="homeLogo">
        <img style="width: 160px; height: 160px;" src="images/group-income-icon-transparent.png">
        <br>
        <div style="display: block; margin-top: 45px;" class="title foco-font"><i18n>Welcome to GroupIncome</i18n></div>
        <div v-if="!$store.state.loggedIn"><a v-on:click="forwardToLogin"><i18n>Login</i18n></a> or  <router-link to="signup"><i18n>Sign Up</i18n></router-link> <i18n>to continue</i18n></div>
      </div>
    </section>
</template>
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
