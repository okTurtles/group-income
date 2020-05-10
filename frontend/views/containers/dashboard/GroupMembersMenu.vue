<template lang="pug">
menu-parent(data-test='menuActions')
  menu-trigger.is-icon-small(aria-label='Show actions')
    i.icon-ellipsis-v

  menu-content.c-actions-content
    ul(v-if='username === ourUsername')
      menu-item(
        tag='button'
        item-id='profile'
        icon='pencil-alt'
        @click='openModal("UserSettingsModal")'
      )
        i18n Edit profile
    ul(v-else)
      menu-item(
        tag='router-link' :to='`/messages/${username}`'
        item-id='message'
        icon='comment'
      )
        i18n Send message
      menu-item(
        tag='button'
        item-id='remove'
        icon='times'
        v-if='groupShouldPropose || ourUsername === groupSettings.groupCreator'
        @click='openModal("RemoveMember", { username })'
      )
        i18n Remove member
</template>

<script>
import { mapGetters } from 'vuex'
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
  props: {
    username: String
  },
  computed: {
    ...mapGetters([
      'ourUsername',
      'groupSettings',
      'groupShouldPropose'
    ])
  },
  methods: {
    openModal (modal, props) {
      sbp('okTurtles.events/emit', OPEN_MODAL, modal, props)
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
  top: 2rem;
  left: auto;
}
</style>
