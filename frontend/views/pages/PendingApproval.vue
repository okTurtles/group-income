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
import GroupWelcome from '@components/GroupWelcome.vue'
import { PROFILE_STATUS } from '@model/contracts/shared/constants'
import sbp from '@sbp/sbp'
import SvgInvitation from '@svgs/invitation.svg'
import { mapGetters, mapState } from 'vuex'
import { CHELONIA_RESET } from 'libchelonia/events'

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
    let reset = false
    let destroyed = false

    const syncPromise = sbp('chelonia/externalStateWait', this.ourIdentityContractId).then(async () => {
      if (destroyed) return
      reset = false
      // We don't want to accidentally unsubscribe from the group while this
      // page is rendered, so we increase the ephemeral reference count.
      // When this page is destroyed, the reference count is decreased as well.
      // Proper (non-ephemeral) references are handled by the `identity/joinGroup`
      // side-effects. In general, UI elements should not be changing
      // non-ephemeral references.
      await sbp('chelonia/contract/retain', this.ephemeral.groupIdWhenMounted, { ephemeral: true })
      this.ephemeral.contractFinishedSyncing = true
      if (this.haveActiveGroupProfile) {
        this.ephemeral.groupJoined = true
      } else {
        // The `join` action could have failed for a variety of reasons, such as
        // an unreliable network connection. Calling `join` multiple times with
        // the same parameter should pick up from where we last left off, so it
        // shouldn't break things.
        // We call `join` again here for two purposes:
        //   1. If `join` failed, we'll ensure that it will be retried.
        //   2. If `join` failed, this will retry when the page is refreshed,
        //      which align with user expectations.
        // In addition, there's `gi.actions/group/reattemptFailedJoins`, which
        // is non-persistent (i.e., restarting the SW will erase it).
        const [state, innerSigningKeyId, encryptionKeyId] = await Promise.all([
          sbp('chelonia/contract/state', this.ourIdentityContractId),
          sbp('chelonia/contract/currentKeyIdByName', this.ourIdentityContractId, 'csk'),
          sbp('chelonia/contract/currentKeyIdByName', this.ourIdentityContractId, 'cek')
        ])

        if (!state.groups[this.ephemeral.groupIdWhenMounted]) return
        await sbp('gi.actions/group/join', {
          originatingContractID: this.ourIdentityContractId,
          originatingContractName: 'gi.contracts/identity',
          contractID: this.ephemeral.groupIdWhenMounted,
          contractName: 'gi.contracts/group',
          reference: state.groups[this.ephemeral.groupIdWhenMounted].hash,
          signingKeyId: state.groups[this.ephemeral.groupIdWhenMounted].inviteSecretId,
          innerSigningKeyId,
          encryptionKeyId
        })
      }
    }).catch(e => {
      console.error('[PendingApproval.vue]: Error waiting for contract to finish syncing', e)
    })
    const listener = () => { reset = true }
    this.ephemeral.ondestroy = () => {
      destroyed = true
      sbp('okTurtles.events/off', CHELONIA_RESET, listener)
      syncPromise.finally(() => {
        if (reset) return
        sbp('chelonia/contract/release', this.ephemeral.groupIdWhenMounted, { ephemeral: true }).catch(e => {
          console.error('[PendingApproval.vue]: Error releasing contract', e)
        })
      })
    }
    // If Chelonia was reset, it means that ephemeral references have been
    // lost, and we should not release the contract.
    sbp('okTurtles.events/on', CHELONIA_RESET, listener)
  },
  beforeDestroy () {
    this.ephemeral.ondestroy?.()
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
