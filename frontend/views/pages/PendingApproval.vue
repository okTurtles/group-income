<template lang="pug">
div
  group-welcome.c-welcome(v-if='ephemeral.groupJoined')
  .c-container(v-else)
    svg-invitation.c-svg

    i18n.is-title-1(
      data-test='pendingApprovalTitle'
      :data-groupId='ephemeral.groupIdWhenMounted'
      tag='h2'
      :args='{ groupName: ephemeral.settings.groupName }'
    ) Waiting for approval to join {groupName}!

    i18n.has-text-1.c-text(tag='p') You have used a public link to join a group. Once a member of the group approves your member request you’ll be able to access the group.
</template>

<script>
import sbp from '@sbp/sbp'
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
        contractFinishedSyncing: false,
        groupIdWhenMounted: null,
        groupJoined: false,
        settings: {}
      }
    }
  },
  computed: {
    ...mapGetters(['ourIdentityContractId']),
    ...mapState(['currentGroupId']),
    groupState () {
      if (!this.ephemeral.groupIdWhenMounted) return
      return this.$store.state[this.ephemeral.groupIdWhenMounted]
    },
    haveActiveGroupProfile () {
      const state = this.groupState
      return (
        // We want the group state to be active
        state?.profiles?.[this.ourIdentityContractId]?.status === PROFILE_STATUS.ACTIVE
      )
    }
  },
  mounted () {
    this.ephemeral.groupIdWhenMounted = this.currentGroupId
    sbp('chelonia/contract/wait', this.ourIdentityContractId).then(async () => {
      await sbp('chelonia/contract/sync', this.ephemeral.groupIdWhenMounted)
      this.ephemeral.contractFinishedSyncing = true
      if (this.haveActiveGroupProfile) {
        this.ephemeral.groupJoined = true
      }
    }).catch(e => {
      console.error('[PendingApproval.vue]: Error waiting for contract to finish syncing', e)
    })
  },
  watch: {
    groupState (to) {
      if (to?.settings && this.ephemeral.settings !== to.settings) {
        this.ephemeral.settings = to.settings
      }
    },
    haveActiveGroupProfile (to) {
      // if our group profile appears in the group state, it means we've joined the group
      const newValue = to && this.ephemeral.contractFinishedSyncing
      if (newValue !== this.ephemeral.groupJoined) {
        this.ephemeral.groupJoined = newValue
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
