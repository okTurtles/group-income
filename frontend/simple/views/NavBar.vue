<template>
  <nav class="navbar container gi">
    <div class="navbar-start">
      <router-link to="home" class="navbar-item" @click="toggleTimeTravel">
        <img src="/simple/images/logo-transparent.png">
      </router-link>
    </div>
      <div class="navbar-center">
        <!-- TODO: use v-for to dynamically generate these? -->
        <router-link
          active-class="is-active"
          class="nav-item is-tab"
          data-test="CreateGroup"
          to="new-group"
          v-if="$store.state.loggedIn"
        >
          <i18n>Start a Group</i18n>
        </router-link>
        <router-link
          active-class="is-active"
          class="nav-item is-tab"
          to="pay-group"
          v-if="$store.state.loggedIn"
        >
          <i18n>Pay Group</i18n>
        </router-link>
        <router-link
          active-class ="is-active"
          class="nav-item"
          data-test="MailboxLink"
          to="mailbox"
          v-if="$store.state.loggedIn"
        >
          <i18n>Inbox</i18n>
          <span
            data-test="AlertNotification"
            class="icon"
            style="color: #ed6c63;"
            v-if="$store.getters.unreadMessageCount || $store.getters.proposals.length"
          >
            <i class="fa fa-bell"></i>
          </span>
        </router-link>
      </div>
      <div class="navbar-end">
        <span class="navbar-item">
          <router-link
            class="button is-success"
            data-test="SignupBtn"
            style="margin-right: 15px;"
            to="signup"
            v-if="!$store.state.loggedIn"
          >
            <i18n>Sign Up</i18n>
          </router-link>
          <button class="button is-primary"
            data-test="LoginBtn"
            v-if="!$store.state.loggedIn"
            @click="showLoginModal"
          >
            <i18n>Login</i18n>
          </button>

          <div class="button profile-link" data-test="OpenProfileDropDown" v-if="$store.state.loggedIn" @click="toggleDropdown">
            <strong>{{ ($store.getters.currentUserIdentityContract && $store.getters.currentUserIdentityContract.attributes && $store.getters.currentUserIdentityContract.attributes.displayName ? $store.getters.currentUserIdentityContract.attributes.displayName : null) || $store.state.loggedIn.name}}</strong>
            <img v-if="$store.getters.currentUserIdentityContract && $store.getters.currentUserIdentityContract.attributes && $store.getters.currentUserIdentityContract.attributes.picture" v-bind:src="$store.getters.currentUserIdentityContract.attributes.picture">
            <i class="fa fa-caret-down" style="color: #d8d8d8;" aria-hidden="true"></i>
          </div>
        </span>
      </div>
      <div class="menu-dropdown" v-if="dropdownVisible">
        <div class="button profile-link" id="CloseProfileDropDown" v-if="$store.state.loggedIn" @click="toggleDropdown">
          <strong>{{ ($store.getters.currentUserIdentityContract && $store.getters.currentUserIdentityContract.attributes && $store.getters.currentUserIdentityContract.attributes.displayName ? $store.getters.currentUserIdentityContract.attributes.displayName : null) || $store.state.loggedIn.name}}</strong>
          <img v-if="$store.getters.currentUserIdentityContract && $store.getters.currentUserIdentityContract.attributes && $store.getters.currentUserIdentityContract.attributes.picture" v-bind:src="$store.getters.currentUserIdentityContract.attributes.picture">
          <i class="fa fa-caret-down" style="color: #d8d8d8;" aria-hidden="true"></i>
        </div>
        <router-link
          id="ProfileLink"
          class="nav-item is-tab"
          active-class="is-active"
          to="user"
          v-show="$store.state.loggedIn"
        >
          <i18n>Profile</i18n>
        </router-link>
        <a
          class="is-danger"
          href="#"
          id="LogoutBtn"
          v-if="$store.state.loggedIn"
          @click.prevent="logout"
        >
          <i18n>Signout</i18n>
        </a>
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
.nav {
  margin: 15px 0;
}

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

.profile-link {
  border: 0;

  &:active {
    box-shadow: none;
  }

  img {
    border-radius: 999px;
    max-height: 43px;
    margin-left: 15px;
    margin-right: 8px;
  }
}

.menu-dropdown {
  background: whitesmoke;
  border-radius: 6px;
  padding: 14px 10px 15px;
  position: absolute;
  top: -6px;
  right: 2px;
  text-align: center;
  z-index: 10;

  .button {
    background: none;
  }
}

</style>
<script>
import Vue from 'vue'
import TimeTravel from './TimeTravel.vue'
import LoginModal from '../components/login-modal.vue'

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
      this.dropdownVisible = false
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
    },
    toggleDropdown () {
      this.dropdownVisible = !this.dropdownVisible
    }
  },
  data () {
    return {
      showTimeTravel: false,
      loginModalVisible: false,
      dropdownVisible: false
    }
  }
}
</script>
