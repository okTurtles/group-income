<template lang="pug">
  tooltip(direction='bottom-right')
    span.button.is-icon-small(data-test='pendingTooltip')
      i.icon-question-circle
    template(slot='tooltip')
      p {{tooltipText }}
</template>

<script>
import { mapGetters } from 'vuex'
import Tooltip from '@components/Tooltip.vue'
import { L } from '@common/common.js'

export default ({
  name: 'GroupMembersTooltipPending',
  components: {
    Tooltip
  },
  props: {
    contractID: String
  },
  computed: {
    ...mapGetters([
      'ourIdentityContractId',
      'groupMembersPending'
    ]),
    tooltipText () {
      const invitedBy = (this.groupMembersPending[this.username] || {}).invitedBy

      return this.contractID === this.ourIdentityContractId
        ? L('This member did not use their invite link to join the group yet. This link should be given to them by {invitedBy} (you).', { invitedBy })
        : L('This member did not use their invite link to join the group yet. This link should be given to them by {invitedBy}.', { invitedBy })
    }
  }
}: Object)
</script>
