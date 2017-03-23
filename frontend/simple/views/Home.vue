<template>
    <section class="section full-screen">
        <div class="columns">
            <div class="column is-1"></div>
            <div class="column is-10" >
              <div style="text-align: center">
                    <img style="width: 320x; height: 320px" src="images/group-income-icon-transparent.png">
                    <br>
                    <div style="display: block; margin-top: 45px" class="title brand-font"><i18n>Welcome to GroupIncome</i18n></div>
                    <div v-if="!$store.state.loggedIn"><a v-on:click="forwardToLogin"><i18n>Login</i18n></a> or  <router-link to="signup"><i18n>Sign Up</i18n></router-link> <i18n>to continue</i18n></div>
              </div>
            </div>
            <div class="column is-1"></div>
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
