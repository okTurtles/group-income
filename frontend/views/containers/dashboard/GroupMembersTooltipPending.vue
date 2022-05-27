<template lang="pug">
  tooltip(direction='bottom-end')
    span.button.is-icon-small(data-test='pendingTooltip')
      i.icon-question-circle
    template(slot='tooltip')
      p {{tooltipText }}
</template>

<script>
import { mapGetters } from 'vuex'
import Tooltip from '@components/Tooltip.vue'
import {
  L
} from '/assets/js/common.js' // eslint-disable-line import/no-absolute-path

export default ({
  name: 'GroupMembersTooltipPending',
  components: {
    Tooltip
  },
  props: {
    username: String
  },
  computed: {
    ...mapGetters([
      'ourUsername',
      'groupMembersPending'
    ]),
    tooltipText () {
      const invitedBy = (this.groupMembersPending[this.username] || {}).invitedBy

      return this.username === this.ourUsername
        ? L('This member did not use their invite link to join the group yet. This link should be given to them by {invitedBy} (you).', { invitedBy })
        : L('This member did not use their invite link to join the group yet. This link should be given to them by {invitedBy}.', { invitedBy })
    }
  }
}: Object)
</script>
