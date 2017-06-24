<template>
  <div>
    <!-- see: http://bulma.io/documentation/components/nav/ -->
    <nav class="nav has-shadow">
      <div class="container">
        <div class="nav-left">
          <router-link to="home" class="nav-item" @click="toggleTimeTravel">
            <img src="images/logo-transparent.png">
          </router-link>
        </div>
        <div class="nav-center">
          <!-- TODO: use v-for to dynamically generate these? -->
          <router-link
            active-class="is-active"
            class="nav-item is-tab"
            id="CreateGroup"
            to="new-group"
          >
            <i18n>Start a group</i18n>
          </router-link>
          <router-link
            id="ProfileLink"
            class="nav-item is-tab"
            active-class="is-active"
            to="user"
            v-show="$store.state.loggedIn"
          >
            <i18n>Profile</i18n>
          </router-link>
          <router-link
            active-class="is-active"
            class="nav-item is-tab"
            to="pay-group"
            v-show="$store.state.loggedIn"
          >
            <i18n>Pay Group</i18n>
          </router-link>
          <router-link
            active-class ="is-active"
            class="nav-item"
            id="MailboxLink"
            to="mailbox"
            v-if="$store.state.loggedIn"
          >
            <i18n>Mailbox</i18n>
            <span
              id="AlertNotification"
              class="icon"
              style="color: #ed6c63"
              v-if="$store.getters.unreadMessageCount"
            >
              <i class="fa fa-bell"></i>
            </span>
          </router-link>
        </div>
        <div class="nav-item">
          <group-switcher
            style="margin-right: 1rem;"
            v-if="$store.state.loggedIn && groups && groups.length"
            :currentGroupId="currentGroupId"
            :groups="groups"
          />
        </div>
        <div class="nav-right">
          <span class="nav-item is-tab control">
            <router-link
              class="button is-success"
              id="SignupBtn"
              to="signup"
              v-if="!$store.state.loggedIn"
            >
              <i18n>Sign Up</i18n>
            </router-link>
            <a
              class="button is-primary"
              href="#"
              id="LoginBtn"
              v-if="!$store.state.loggedIn"
              @click.prevent="showLoginModal"
            >
              <i18n>Login</i18n>
            </a>
            <a
              class="button is-danger"
              href="#"
              id="LogoutBtn"
              v-if="$store.state.loggedIn"
              @click.prevent="logout"
            >
              <i18n>Signout</i18n>
            </a>
            <div class="button" style="border: 0" v-if="$store.state.loggedIn">
              <img v-if="$store.getters.currentUserIdentityContract && $store.getters.currentUserIdentityContract.attributes && $store.getters.currentUserIdentityContract.attributes.picture" v-bind:src="$store.getters.currentUserIdentityContract.attributes.picture">&nbsp;<strong>Welcome, {{ ($store.getters.currentUserIdentityContract && $store.getters.currentUserIdentityContract.attributes && $store.getters.currentUserIdentityContract.attributes.displayName ? $store.getters.currentUserIdentityContract.attributes.displayName : null) || $store.state.loggedIn.name}}</strong>
            </div>
          </span>
        </div>
      </div>
    </nav>
    <login-modal
      v-if="loginModalVisible"
      @close="closeLoginModal"
    />
    <time-travel v-show="showTimeTravel" :toggleVisibility="toggleTimeTravel" />
  </div>
</template>

<style lang="scss" scoped>
div.nav-left {
  overflow: visible;
  z-index: 10;
  a {
    background-color: #fff;
  }
}
div.nav-center {
  flex-shrink: inherit;
}
</style>

<script>
import Vue from 'vue'
import GroupSwitcher from '../components/group-switcher.vue'
import TimeTravel from './TimeTravel.vue'
import LoginModal from '../components/login-modal.vue'

export default {
  name: 'NavBar',
  components: {
    LoginModal,
    GroupSwitcher,
    TimeTravel
  },
  created () {
    Vue.events.$on('loginModal', this.showLoginModal)
  },
  mounted () {
    global.addEventListener('keyup', this.handleKeyUp)
  },
  computed: {
    currentGroupId () {
      return this.$store.state.currentGroupId
    },
    groups () {
      return this.$store.getters.groupsByName
    }
  },
  methods: {
    handleKeyUp (event) {
      if (this.visible && event.keyCode === 27) {
        this.closeLoginModal()
      }
    },
    logout () {
      this.$store.dispatch('logout')
    },
    showLoginModal () {
      this.loginModalVisible = true
    },
    closeLoginModal () {
      this.loginModalVisible = false
    },
    toggleTimeTravel (event) {
      if (!event.altKey) return
      event.preventDefault()
      this.showTimeTravel = !this.showtimetravel
    }
  },
  data () {
    return {
      showTimeTravel: false,
      loginModalVisible: false
    }
  }
}
</script>
