<template lang="pug">
  tooltip(direction='bottom-right')
    span.button.is-icon-small(data-test='pendingTooltip')
      i.icon-question-circle
    template(slot='tooltip')
      p {{ tooltipText }}
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
    contractID: String,
    data: Object
  },
  methods: {
    getDisplayName (memberId) {
      const profile = this.globalProfile(memberId)
      return profile?.displayName || profile?.username || memberId
    }
  },
  computed: {
    ...mapGetters([
      'ourIdentityContractId',
      'globalProfile'
    ]),
    tooltipText () {
      const invitedBy = this.getDisplayName(this.data?.invitedBy)

      return this.ourIdentityContractId === this.data?.invitedBy
        ? L('This member did not use their invite link to join the group yet. This link should be given to them by {invitedBy} (you).', { invitedBy })
        : L('This member did not use their invite link to join the group yet. This link should be given to them by {invitedBy}.', { invitedBy })
    }
  }
}: Object)
</script>
