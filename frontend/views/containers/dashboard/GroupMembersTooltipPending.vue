<template lang="pug">
  tooltip(direction='bottom-end')
    span.button.is-icon-small(data-test='pendingTooltip')
      i.icon-question-circle
    template(slot='tooltip')
      i18n(
        tag='p'
        :args='{ invitedBy: `${invitedBy} ${invitedBy === ourUsername ? `(${L("you")})` : ""}` }'
      ) This member did not use their invite link to join the group yet. This link should be given to them by {invitedBy}
</template>

<script>
import { mapGetters } from 'vuex'
import Tooltip from '@components/Tooltip.vue'

export default {
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
    invitedBy () {
      return (this.groupMembersPending[this.username] || {}).invitedBy
    }
  }
}
</script>
