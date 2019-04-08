<template>
  <div class="level is-mobile c-profile" v-if="$store.state.loggedIn">
    <div class="level-left">
      <avatar :src="userPicture" hasMargin />
      <div class="c-user">
        <p class="gi-is-ellipsis has-text-weight-bold"
          :data-test="userDisplayName ? 'profileName' : 'profileDisplayName'"
          :class="`has-text-${isDarkTheme ? 'white' : 'dark'}`">
          {{userDisplayName ? userDisplayName : userName}}
        </p>
        <span class="gi-is-ellipsis is-size-6" data-test="profileDisplayName" v-if="userDisplayName">{{userName}}</span>
      </div>
    </div>
    <div class="level-right">
      <button class="button is-icon" data-test="settingsBtn"
        @click="openModal('Settings')">
        <i class="fa fa-cog"></i>
      </button>
    </div>
  </div>
</template>
<style lang="scss" scoped>
@import "../../../assets/sass/theme/index";

.c-profile {
  background-color: $primary-bg-a;
  padding: $gi-spacer-sm;
  margin-top: 0.75rem;
}

.c-user {
  max-width: 5rem;
  white-space: nowrap;
  line-height: 1.15rem;

  span {
    color: $text-light;
  }
}

// https://vue-loader.vuejs.org/guide/scoped-css.html#deep-selectors
/deep/ .button {
  .fa-cog {
    font-size: 0.7rem;
    transition: transform ease-out 0.3s;
  }

  &:hover .fa-cog {
    transform: rotate(180deg);
  }
}
</style>
<script>
import Avatar from '../../components/Avatar.vue'
import sbp from '../../../../shared/sbp.js'
import { LOAD_MODAL } from '../../../utils/events.js'
import { mapGetters } from 'vuex'

export default {
  name: 'Profile',
  components: {
    Avatar
  },
  computed: {
    ...mapGetters([
      'isDarkTheme'
    ]),
    userPicture () {
      return this.$store.getters.currentUserIdentityContract &&
        this.$store.getters.currentUserIdentityContract.attributes &&
        this.$store.getters.currentUserIdentityContract.attributes.picture
    },
    userDisplayName () {
      return this.$store.getters.currentUserIdentityContract &&
        this.$store.getters.currentUserIdentityContract.attributes &&
        this.$store.getters.currentUserIdentityContract.attributes.displayName
    },
    userName () {
      return this.$store.state.loggedIn.name
    }
  },
  methods: {
    openModal (mode) {
      sbp('okTurtles.events/emit', LOAD_MODAL, mode)
    }
  }
}
</script>
