<template lang='pug'>
// This card isn't currently used anywhere and originally was just commented out in GroupSettings.vue
// But keeping it as a component in case it's needed in the future.
.card
  i18n.has-text-1(tag='p') This will delete all the data associated with this group permanently.

  .buttons(v-if='groupMembersCount === 1')
    i18n.is-danger.is-outlined(
      tag='button'
      ref='delete'
      @click='openDeleteGroupModal'
      data-test='deleteBtn'
    ) Delete group

  banner-simple(severity='info' v-else)
    i18n(
      :args='{ count: groupMembersCount - 1, groupName: groupSettings.groupName, ...LTags("b")}'
    ) You can only delete a group when all the other members have left. {groupName} still has {b_}{count} other members{_b}.
</template>

<script>
import sbp from '@sbp/sbp'
import { OPEN_MODAL } from '@utils/events.js'
import BannerSimple from '@components/banners/BannerSimple.vue'
import { mapGetters } from 'vuex'

export default {
  name: 'DeleteGroup',
  components: {
    BannerSimple
  },
  computed: {
    ...mapGetters(['groupMembersCount', 'groupSettings'])
  },
  methods: {
    openDeleteGroupModal () {
      sbp('okTurtles.events/emit', OPEN_MODAL, 'GroupDeletionModal')
    }
  }
}
</script>
