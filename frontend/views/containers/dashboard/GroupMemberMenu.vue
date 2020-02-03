<template lang="pug">
menu-parent
  menu-trigger.is-icon-small
    i.icon-ellipsis-v

  // TODO later - be a drawer on mobile
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
import { MenuParent, MenuTrigger, MenuContent, MenuItem } from '@components/Menu/index.js'
import { OPEN_MODAL } from '@utils/events.js'
import sbp from '~/shared/sbp.js'
export default {
  name: 'GroupMembers',
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
