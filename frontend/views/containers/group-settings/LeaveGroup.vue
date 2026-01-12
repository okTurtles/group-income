<template lang='pug'>
.card
  i18n.has-text-1.c-card-text(
    tag='p'
    :args='LTags("b")'
  ) This means you will stop having access to the {b_}group chat{_b} (including direct messages to other group members) and {b_}contributions{_b}. Re-joining the group is possible, but requires other members to vote and reach an agreement.

  .buttons
    i18n.is-danger.is-outlined(
      tag='button'
      ref='leave'
      @click='handleLeaveGroup'
      data-test='leaveModalBtn'
    ) Leave group
</template>

<script>
import sbp from '@sbp/sbp'
import { mapGetters } from 'vuex'
import { OPEN_MODAL } from '@utils/events.js'

export default {
  name: 'LeaveGroup',
  computed: {
    ...mapGetters(['currentGroupOwnerID', 'ourIdentityContractId'])
  },
  methods: {
    openProposal (component) {
      sbp('okTurtles.events/emit', OPEN_MODAL, component)
    },
    handleLeaveGroup () {
      if (this.currentGroupOwnerID === this.ourIdentityContractId) {
        this.openProposal('GroupDeletionModal')
      } else {
        this.openProposal('GroupLeaveModal')
      }
    }
  }
}
</script>

<style lang="scss" scoped>
@import "@assets/style/_variables.scss";

.c-card-text {
  margin-bottom: 1.5rem;
}
</style>
