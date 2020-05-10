<template lang='pug'>
.c-profile(
  v-if='$store.state.loggedIn'
  data-test='userProfile'
)
  profile-card(:username='ourUsername' direction='top-left')
    button.is-unstyled.c-avatar-user(data-test='openProfileCard')
      avatar-user(:username='ourUsername' size='sm')
      .c-user
        strong(
          :data-test='userDisplayName ? "profileDisplayName" : "profileName"'
        ) {{ userDisplayName || ourUsername }}

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
import AvatarUser from '@components/AvatarUser.vue'
import ProfileCard from '@components/ProfileCard.vue'
import sbp from '~/shared/sbp.js'
import { OPEN_MODAL } from '@utils/events.js'
import { mapGetters } from 'vuex'

export default {
  name: 'Profile',
  components: {
    AvatarUser,
    ProfileCard
  },
  computed: {
    ...mapGetters([
      'ourUsername'
    ]),
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
  height: 4rem;
  padding: 0 1rem;
}

.c-avatar-user {
  display: flex;
  align-items: center;

  &:focus,
  &:hover {
    .c-user strong {
      border-bottom-color: $text_0;
    }
  }
}

.c-user {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  margin-left: 0.5rem;
  max-width: 7rem;
  white-space: nowrap;
  line-height: 1.3;
  margin-top: 1px;

  strong {
    border-bottom: 1px solid transparent;
  }

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
