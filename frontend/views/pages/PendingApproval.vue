<template lang="pug">
div
  group-welcome.c-welcome(v-if='ephemeral.groupJoined')
  .c-container(v-else)
    svg-invitation.c-svg

    i18n.is-title-1(
      tag='h2'
      :args='{ groupName: groupSettings.groupName }'
    ) Waiting for approval to join {groupName}!

    i18n.has-text-1.c-text(tag='p') You have used a public link to join a group. Once a member of the group approves your member request you’ll be able to access the group.
</template>

<script>
import GroupWelcome from '@components/GroupWelcome.vue'
import { PROFILE_STATUS } from '@model/contracts/shared/constants'
import SvgInvitation from '@svgs/invitation.svg'
import { mapGetters, mapState } from 'vuex'

export default ({
  name: 'PendingApproval',
  components: {
    SvgInvitation,
    GroupWelcome
  },
  data () {
    return {
      ephemeral: {
        groupIdWhenMounted: null,
        groupJoined: false
      }
    }
  },
  computed: {
    ...mapGetters(['groupSettings', 'ourUsername']),
    ...mapState(['currentGroupId']),
    ourGroupProfile () {
      if (!this.ephemeral.groupIdWhenMounted) return
      return this.$store.state[this.ephemeral.groupIdWhenMounted]?.profiles?.[this.ourUsername]?.status === PROFILE_STATUS.ACTIVE
    }
  },
  mounted () {
    this.ephemeral.groupIdWhenMounted = this.currentGroupId
    this.ephemeral.groupJoined = !!this.ourGroupProfile
  },
  watch: {
    ourGroupProfile (to) {
      // if our group profile appears in the group state, it means we've joined the group
      if (to) {
        this.ephemeral.groupJoined = true
      }
    }
  }
}: Object)
</script>

<style lang="scss" scoped>
@import "@assets/style/_variables.scss";

.c-container {
  display: flex;
  flex-direction: column;
  height: 100%;
  width: 100%;
  max-width: 34.5rem;
  margin: auto;
  justify-content: center;
  align-items: center;
  text-align: center;
  gap: 1rem;

  @include phone {
    padding: 0 1rem;
  }

  @include desktop {
    position: fixed;
    left: 50%;
    transform: translateX(-50%);
  }
}

.c-svg {
  display: inline-block;
  margin-top: -3rem;

  @include tablet {
    transform: scale(1.25);
    margin-bottom: 1rem;
  }
}

.c-text {
  font-size: $size_4;
}

::v-deep .c-welcome.wrapper {
  position: fixed;
  top: 0;
  left: 0;
  min-width: 100vw;
  width: 100vw;
  height: 100%;
  background-color: $background_0;
  z-index: $zindex-sidebar + 1;
}
</style>
