<template>
  <div class="level is-mobile c-profile" v-if="$store.state.loggedIn">
    <div class="level-left">
      <avatar :src="userPicture" hasMargin />
      <div class="c-user">
        <p class="gi-is-ellipsis has-text-weight-bold" :class="`has-text-${isDarkTheme ? 'white' : 'dark'}`">{{userDisplayName ? userDisplayName : userName}}</p>
        <span class="gi-is-ellipsis is-size-6" data-test="profileDisplayName" v-if="userDisplayName">{{userName}}</span>
      </div>
    </div>
    <div class="level-right">
      <!-- <button class="button is-icon"
        data-test="logoutBtn"
        @click.prevent="logout">
        <i class="fa fa-sign-out-alt"></i>
      </button> -->
      <router-link class="button is-icon"
        tag="button"
        to="/user"
        data-test="profileLink">
        <i class="fa fa-cog"></i>
      </router-link>
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
  // },
  // methods: {
  //   logout () {
  //     this.$store.dispatch('logout')
  //   }
  }
}
</script>
