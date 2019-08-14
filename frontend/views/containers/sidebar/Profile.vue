<template lang='pug'>
.c-profile(v-if='$store.state.loggedIn')
  .c-avatar-user
    avatar(:src='userPicture')
    .c-user
      strong(
        :data-test="userDisplayName ? 'profileName' : 'profileDisplayName'"
        :class="`has-text-${isDarkTheme ? 'white' : 'dark'}`"
      ) {{userDisplayName ? userDisplayName : userName}}

      span.is-size-6(
        data-test='profileDisplayName'
        v-if='userDisplayName'
      ) {{userName}}

  button.is-icon(
    data-test='settingsBtn'
    @click="openModal('Settings')"
  )
    i.icon-cog
</template>

<script>
import Avatar from '@components/Avatar.vue'
import sbp from '~/shared/sbp.js'
import { LOAD_MODAL } from '@utils/events.js'
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

<style lang="scss" scoped>
@import "../../../assets/style/_variables.scss";

.c-profile {
  display: flex;
  justify-content: space-between;
  align-items: center;
  height: 52px;
  padding: 0 $spacer-sm;
  margin-top: 0.75rem;
  background-color: $primary_2;
}

.c-avatar-user {
  display: flex;
  align-items: center;
}

.c-avatar {
  width: $spacer-lg;
  height: $spacer-lg;
}

.c-user {
  display: flex;
  flex-direction: column;
  margin-left: 1rem;
  max-width: 5rem;
  white-space: nowrap;
  line-height: 1.15rem;

  span {
    color: $text_1;
  }
}

button {
  .icon-cog {
    font-size: 0.75rem;
    margin-left: 0;
  }

  &:hover .icon-cog,
  &:focus .icon-cog {
    animation: cog 400ms forwards;
  }
}

@keyframes cog {
  to { transform: rotate(180deg); }
}
</style>
