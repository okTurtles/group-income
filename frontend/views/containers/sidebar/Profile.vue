<template lang='pug'>
.c-profile(
  v-if='$store.state.loggedIn'
  data-test="userProfile"
  )
  .c-avatar-user
    avatar(:src='userPicture')
    .c-user
      strong(
        :data-test="userDisplayName ? 'profileDisplayName' : 'profileName'"
      ) {{userDisplayName ? userDisplayName : userName}}

      span(
        data-test='profileName'
        v-if='userDisplayName'
      ) {{userName}}

  button.is-icon-small(
    data-test='settingsBtn'
    @click="openModal('Settings')"
  )
    i.icon-cog
</template>

<script>
import Avatar from '@components/Avatar.vue'
import sbp from '~/shared/sbp.js'
import { OPEN_MODAL } from '@utils/events.js'

export default {
  name: 'Profile',
  components: {
    Avatar
  },
  computed: {
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
      return this.$store.state.loggedIn.username
    }
  },
  methods: {
    openModal (mode) {
      sbp('okTurtles.events/emit', OPEN_MODAL, mode)
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
  height: $spacer-xl;
  padding: 0 $spacer;
  margin-top: 0.35rem;
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
  margin-left: 0.5rem;
  max-width: 5rem;
  white-space: nowrap;
  line-height: 1.3rem;
  font-family: "Poppins";
  margin-top: 1px;

  span {
    color: $text_1;
  }
}

button {
  .icon-cog {
    font-size: 0.9rem;
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
