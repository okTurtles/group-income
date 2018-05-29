<template>
  <nav class="navbar">
    <div class="navbar-start is-flex">
      <router-link to="home" class="navbar-item gi-logo" @click="toggleTimeTravel">
        <img src="/simple/images/logo-transparent.png"  alt="Groupincome's logo">
      </router-link>
    </div>
      <div class="navbar-end is-flex">
        <div class="navbar-item signUp-item" v-if="!$store.state.loggedIn">
          <router-link
            class="button is-success"
            data-test="signupBtn"
            to="signup"
          >
            <i18n>Sign Up</i18n>
          </router-link>
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
            <img class="avatar" v-if="$store.getters.currentUserIdentityContract &&
              $store.getters.currentUserIdentityContract.attributes &&
              $store.getters.currentUserIdentityContract.attributes.picture"
              v-bind:src="$store.getters.currentUserIdentityContract.attributes.picture"
            >
            <span>
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
      <login-modal
        v-if="loginModalVisible"
        @close="closeLoginModal"
      />
      <time-travel v-show="showTimeTravel" :toggleVisibility="toggleTimeTravel" />
    </div>
  </nav>
</template>
<style lang="scss" scoped>
.gi-logo {
  padding-left: 2rem;
}

.signUp-item {
  padding-right: 0;
}

.avatar {
  border-radius: 50%;
  max-height: 2.5rem;
  margin: 0 0.5rem;
}
</style>
<script>
import Vue from 'vue'
import TimeTravel from './TimeTravel.vue'
import LoginModal from '../containers/LoginModal.vue'

export default {
  name: 'NavBar',
  components: {
    LoginModal,
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
