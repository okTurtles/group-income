<template>
  <nav class="navbar">
    <div class="navbar-start is-flex">
      <router-link to="home" class="navbar-item gi-logo c-logo no-border" @click="toggleTimeTravel">
        <img src="/assets/images/logo-transparent.png"  alt="Groupincome's logo">
      </router-link>
    </div>
      <div class="navbar-end is-flex">
        <div class="navbar-item c-signup" v-if="!$store.state.loggedIn">
          <button
            class="button is-success"
            data-test="signupBtn"
            @click="showSignUpModal"
          >
            <i18n>Sign Up</i18n>
          </button>
        </div>
        <div class="navbar-item" v-if="!$store.state.loggedIn">
          <button class="button is-primary"
            data-test="loginBtn"
            @click="showLoginModal"
          >
            <i18n>Login</i18n>
          </button>
        </div>
        <router-link v-if="$store.state.loggedIn"
          active-class="is-active"
          class="navbar-item navbar-main-item"
          to="pay-group"
        >
          <i18n>Pay Group</i18n>
        </router-link>
        <router-link v-if="$store.state.loggedIn"
          active-class="is-active"
          class="navbar-item navbar-main-item"
          to="dashboard"
        >
          <i18n>Groups</i18n>
        </router-link>
        <router-link v-if="$store.state.loggedIn"
          active-class ="is-active"
          class="navbar-item navbar-main-item"
          data-test="mailboxLink"
          to="mailbox"
        >
          <i18n>Inbox</i18n>
          <span
            data-test="alertNotification"
            class="icon"
            style="color: #ed6c63;"
            v-if="$store.getters.unreadMessageCount || $store.getters.proposals.length"
          >
            <i class="fa fa-bell"></i>
          </span>
        </router-link>
        <div data-test="openProfileDropDown"
          class="navbar-item has-dropdown is-hoverable gi-is-profile"
          v-if="$store.state.loggedIn">
          <a class="navbar-link">
            <img class="c-avatar" v-if="$store.getters.currentUserIdentityContract &&
              $store.getters.currentUserIdentityContract.attributes &&
              $store.getters.currentUserIdentityContract.attributes.picture"
              v-bind:src="$store.getters.currentUserIdentityContract.attributes.picture"
            >
            <span data-test="profileDisplayName">
              {{ ($store.getters.currentUserIdentityContract &&
                $store.getters.currentUserIdentityContract.attributes &&
                $store.getters.currentUserIdentityContract.attributes.displayName) ||
                $store.state.loggedIn.name
              }}
            </span>
          </a>
          <div class="navbar-dropdown is-right">
            <router-link
              class="navbar-item"
              data-test="profileLink"
              to="user"
              v-show="$store.state.loggedIn"
            >
              <i18n>Profile</i18n>
            </router-link>
            <a class="navbar-item has-text-danger"
              href="#"
              data-test="logoutBtn"
              v-if="$store.state.loggedIn"
              @click.prevent="logout"
            >
              <i18n>Signout</i18n>
            </a>
          </div>
        </div>
      </div>
      <time-travel v-show="ephemeral.showTimeTravel" :toggleVisibility="toggleTimeTravel" />
    </div>
  </nav>
</template>
<style lang="scss" scoped>
.c-logo {
  padding-left: $gi-spacer-lg;
}

.c-signup {
  padding-right: 0;
}

.c-avatar {
  border-radius: 50%;
  max-height: 2.5rem;
  margin: 0 0.5rem;
}
</style>
<script>
import sbp from '../../../shared/sbp.js'
import TimeTravel from './TimeTravel.vue'
import { LOAD_MODAL } from '../../utils/events.js'

export default {
  name: 'NavBar',
  components: {
    TimeTravel
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
    logout () {
      this.$store.dispatch('logout')
    },
    showLoginModal () {
      sbp('okTurtles.events/emit', LOAD_MODAL, 'LoginModal')
    },
    showSignUpModal () {
      sbp('okTurtles.events/emit', LOAD_MODAL, 'SignUp')
    },
    toggleTimeTravel (event) {
      if (!event.altKey) return
      event.preventDefault()
      this.ephemeral.showTimeTravel = !this.ephemeral.showtimetravel
    }
  },
  data () {
    return {
      ephemeral: {
        showTimeTravel: false
      }
    }
  }
}
</script>
