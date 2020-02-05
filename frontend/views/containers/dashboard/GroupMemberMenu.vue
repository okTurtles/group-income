<template lang="pug">
menu-parent
  menu-trigger.is-icon-small
    i.icon-ellipsis-v

  menu-content.c-actions-content
    ul
      menu-item(
        tag='router-link' to='/chat'
        item-id='message'
        icon='comment'
      )
        i18n Send message
      menu-item(
        tag='button'
        item-id='remove'
        icon='times'
        @click='openModal("RemoveMember")'
      )
        i18n Remove member
</template>

<script>
import { MenuParent, MenuTrigger, MenuContent, MenuItem } from '@components/menu/index.js'
import { OPEN_MODAL } from '@utils/events.js'
import sbp from '~/shared/sbp.js'
export default {
  name: 'GroupMembersMenu',
  components: {
    MenuParent,
    MenuTrigger,
    MenuContent,
    MenuItem
  },
  methods: {
    openModal (modal) {
      sbp('okTurtles.events/emit', OPEN_MODAL, modal)
    },
    closeModal () {
      this.$refs.modal.close()
    }
  }
}
</script>

<style lang="scss" scoped>
.c-content {
  width: 12rem;
  margin-left: -12rem;
}
</style>
