<template lang='pug'>
.c-profile(
  v-if='$store.state.loggedIn'
  data-test='userProfile'
)
  profile-card(:contractID='ourIdentityContractId' direction='top-left')
    button.is-unstyled.c-avatar-user(data-test='openProfileCard')
      avatar-user(:contractID='ourIdentityContractId' size='sm')
      .c-user
        strong.has-ellipsis(
          :data-test='ourDisplayName ? "profileDisplayName" : "profileName"'
        ) {{ ourDisplayName || ourUsername || ourIdentityContractId }}

        span.has-ellipsis(
          data-test='profileName'
          v-if='ourDisplayName'
        ) @{{ ourUsername }}

  button.is-icon-small(
    :title='L("User settings")'
    data-test='settingsBtn'
    @click='toUserSettings'
  )
    i.icon-cog
</template>

<script>
import sbp from '@sbp/sbp'
import AvatarUser from '@components/AvatarUser.vue'
import ProfileCard from '@components/ProfileCard.vue'
import { mapGetters } from 'vuex'
import { logExceptNavigationDuplicated } from '@view-utils/misc.js'
import { CLOSE_NAVIGATION_SIDEBAR } from '@utils/events.js'

export default ({
  name: 'Profile',
  components: {
    AvatarUser,
    ProfileCard
  },
  computed: {
    ...mapGetters([
      'ourUsername',
      'ourIdentityContractId'
    ]),
    ourDisplayName () {
      const userContract = this.$store.getters.currentIdentityState
      return userContract && userContract.attributes && userContract.attributes.displayName
    }
  },
  methods: {
    toUserSettings () {
      sbp('okTurtles.events/emit', CLOSE_NAVIGATION_SIDEBAR)
      this.$router.push({ name: 'UserSettings' }).catch(logExceptNavigationDuplicated)
    }
  }
}: Object)
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
    width: 100%;
  }

  span {
    font-family: "Lato";
    color: $text_1;
    width: 100%;
  }
}

button {
  .icon-cog {
    font-size: $size_4;
    transform-origin: 49% 48%;
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
