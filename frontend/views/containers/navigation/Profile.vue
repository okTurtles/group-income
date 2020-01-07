<template lang='pug'>
.c-profile(
  v-if='$store.state.loggedIn'
  data-test='userProfile'
  )
  .c-avatar-user
    avatar(:src='userPicture')
    .c-user
      strong(
        :data-test='userDisplayName ? "profileDisplayName" : "profileName"'
      ) {{ userDisplayName ? userDisplayName : ourUsername }}

      span(
        data-test='profileName'
        v-if='userDisplayName'
      ) @{{ ourUsername }}

  button.is-icon-small(
    data-test='settingsBtn'
    @click='openModal("UserSettingsModal")'
  )
    i.icon-cog
</template>

<script>
import Avatar from '@components/Avatar.vue'
import sbp from '~/shared/sbp.js'
import { OPEN_MODAL } from '@utils/events.js'
import { mapGetters } from 'vuex'

export default {
  name: 'Profile',
  components: {
    Avatar
  },
  computed: {
    ...mapGetters([
      'ourUsername'
    ]),
    userPicture () {
      const userContract = this.$store.getters.ourUserIdentityContract
      return userContract && userContract.attributes && userContract.attributes.picture
    },
    userDisplayName () {
      const userContract = this.$store.getters.ourUserIdentityContract
      return userContract && userContract.attributes && userContract.attributes.displayName
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
@import "@assets/style/_variables.scss";

.c-profile {
  display: flex;
  justify-content: space-between;
  align-items: center;
  height: $spacer-xl;
  padding: 0 $spacer;
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
    font-family: "Lato";
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
