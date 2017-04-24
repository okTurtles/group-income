<template>
  <div>
    <!-- see: http://bulma.io/documentation/components/nav/ -->
    <nav class="nav has-shadow">
      <div class="container">
        <div class="nav-left">
          <a href="/simple/" class="nav-item" @click="toggleTimeTravel">
            <img src="images/logo-transparent.png">
          </a>
        </div>
        <div class="nav-center">
          <!-- TODO: use v-for to dynamically generate these? -->
          <router-link class="nav-item is-tab" active-class="is-active" to="new-group" id="CreateGroup"><i18n>Start a group</i18n></router-link>
          <router-link id="ProfileLink" class="nav-item is-tab" active-class="is-active" to="user" v-show="$store.state.loggedIn"><i18n>Profile</i18n></router-link>
          <!-- <router-link class="nav-item is-tab" active-class="is-active" to="user-group" v-show="$store.state.loggedIn"><i18n>Group</i18n></router-link> -->
          <router-link class="nav-item is-tab" active-class="is-active" to="pay-group" v-show="$store.state.loggedIn"><i18n>Pay Group</i18n></router-link>
          <!-- <router-link class="nav-item is-tab" active-class="is-active" to="ejs-page" id="testEJS"><i18n>EJS test</i18n></router-link> -->
          <router-link class="nav-item is-tab" active-class="is-active" to="event-log"><i18n>Event Log test</i18n></router-link>
          <router-link id="MailboxLink" v-if="$store.state.loggedIn" class="nav-item" active-class ="is-active" to="mailbox">
            <i18n>Mailbox</i18n>&nbsp;
            <span id="AlertNotification" class="icon" style="color: #ed6c63" v-if="$store.getters.unreadMessageCount">
              <i class="fa fa-bell"></i>
            </span>
          </router-link>
        </div>
        <div class="nav-right">
          <span class="nav-item is-tab control">
            <router-link id="SignupBtn" v-show="!$store.state.loggedIn" class="button is-success" to="signup"><i18n>Sign Up</i18n></router-link>
            <a href="#" id="LoginBtn" class="button"
               v-bind:class="$store.state.loggedIn  ? 'is-danger' : 'is-primary'"
              @click.prevent="toggleModal"
            >
              {{$store.state.loggedIn ? 'Sign Out' : 'Log In'}}
            </a>
            <div class="button" style="border: 0" v-if="$store.state.loggedIn">
              <img v-bind:src="$store.getters.picture" data-pin-nopin="true">&nbsp;<strong>Welcome, {{$store.state.loggedIn}}</strong>
            </div>
          </span>
        </div>
      </div>
    </nav>
    <div class="modal" ref="modal" id="LoginModal">
      <div class="modal-background" v-on:click="toggleModal"></div>
      <div class="modal-content" style="width: 300px">
        <div class="card is-rounded">
          <div class="card-content">
            <h1 class="title"><i18n>Log In</i18n></h1>
            <div class="field">
              <p class="control has-icon">
                <input class="input" id="LoginName" name="name" v-model="name" v-validate @keyup.enter="login" data-vv-rules="required|regex:^\S+$" placeholder="username" required>
                <span class="icon">
                  <i class="fa fa-user"></i>
                </span>
              </p>
              <i18n v-show="errors.has('name')" class="help is-danger">Username cannot contain spaces</i18n>
            </div>
            <div class="field">
              <p class="control has-icon">
                <input class="input" id="LoginPassword" name="password" v-model="password" v-validate @keyup.enter="login" data-vv-rules="required|min:7" placeholder="password" type="password" required>
                <span class="icon is-small"><i class="fa fa-lock"></i></span>
              </p>
              <i18n v-show="errors.has('password')" class="help is-danger">Password must be at least 7 characters</i18n>
            </div>
            <p class="help is-danger" id="LoginResponse" v-show="response">{{response}}</p>
            <div class="field">
              <p class="control">
                <button id="LoginButton" class="button is-primary is-medium is-fullwidth"
                  @click="login" :disabled="errors.any() || !fields.passed()"
                >
                  <span class="icon"><i class="fa fa-user"></i></span>
                  <i18n>Login</i18n>
                </button>
              </p>
            </div>
          </div>
        </div>
      </div>
      <div class="modal-close" @click="toggleModal"></div>
    </div>
    <time-travel v-show="showTimeTravel" :toggleVisibility="toggleTimeTravel"></time-travel>
  </div>
</template>

<style lang="sass" scoped>
div.nav-left
  overflow: visible
  z-index: 10
  a
    background-color: #fff
div.nav-center
  flex-shrink: inherit
</style>

<script>
import Vue from 'vue'
import TimeTravel from './TimeTravel.vue'
import {HapiNamespace} from '../js/backend/hapi'
import L from '../js/translations'
var namespace = new HapiNamespace()
export default {
  name: 'NavBar',
  components: {TimeTravel},
  created: function () {
    Vue.events.$on('loginModal', this.toggleModal)
  },
  mounted: function listenKeyUp () {
    global.addEventListener('keyup', this.handleKeyUp)
  },
  methods: {
    handleKeyUp (event) {
      if (this.$refs.modal.classList.contains('is-active')) {
        if (event.keyCode === 27) {
          this.toggleModal()
        }
      }
    },
    login: async function () {
      try {
        // TODO: Insert cryptography here
        let identity = await namespace.lookup(this.name)
        console.log(`Retrieved identity ${identity}`)
        await this.$store.dispatch('login', this.name)
        this.toggleModal()
      } catch (ex) {
        this.response = L('Invalid username or password')
        console.log(L('login failed'))
      }
    },
    logout: function () {
      this.$store.dispatch('logout')
    },
    toggleModal () {
      if (!this.$refs.modal.classList.contains('is-active') && this.$store.state.loggedIn) {
        this.logout()
        this.$router.push({path: '/'})
      } else {
        this.response = null
        this.name = null
        this.password = null
        this.errors.clear()
        // https://github.com/oneuijs/You-Dont-Need-jQuery#css--style
        this.$refs.modal.classList.toggle('is-active')
        if (this.$refs.modal.classList.contains('is-active')) {
          document.getElementById('LoginName').focus()
        }
        if (this.$route.query.next) {
          this.$router.push({path: this.$route.query.next})
        }
      }
    },
    toggleTimeTravel (event) {
      if (event.altKey) {
        event.preventDefault()
        this.showTimeTravel = !this.showTimeTravel
      }
    }
  },
  data () {
    return {
      name: null,
      password: null,
      response: null,
      showTimeTravel: false
    }
  }
}
// TODO: the stuff below
/*
https://github.com/oneuijs/You-Dont-Need-jQuery#css--style
  $('.modal-button').click(function() {
    var target = $(this).data('target');
    $('html').addClass('is-clipped');
    $(target).addClass('is-active');
  });

  $('.modal-background, .modal-close').click(function() {
    $('html').removeClass('is-clipped');
    $(this).parent().removeClass('is-active');
  });

  $('.modal-card-head .delete, .modal-card-foot .button').click(function() {
    $('html').removeClass('is-clipped');
    $('#modal-ter').removeClass('is-active');
  });
*/
</script>
