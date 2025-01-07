<template lang='pug'>
menu-parent.c-permission-action-menu(@select='onMenuSelect')
  menu-trigger.is-icon-small.c-trigger-btn(:aria-label='L("Open permission action menu")')
    i.icon-ellipsis-v

  menu-content.c-menu-content
    ul
      menu-item.c-menu-item(
        v-for='option in menuOptions'
        tag='button'
        :key='option.id'
        :item-id='option.id'
        :icon='option.icon'
      ) {{ option.label }}
</template>

<script>
import { L } from '@common/common.js'
import { MenuParent, MenuContent, MenuTrigger, MenuItem } from '@components/menu'
import { GROUP_ROLES } from '@model/contracts/shared/constants.js'

export default {
  name: 'PermissionActionMenu',
  components: {
    MenuParent,
    MenuContent,
    MenuTrigger,
    MenuItem
  },
  props: {
    role: {
      type: String,
      validator: (role) => Object.values(GROUP_ROLES).includes(role)
    }
  },
  computed: {
    menuOptions () {
      const list = [
        {
          id: 'view',
          label: L('View permissions'),
          icon: 'eye',
          enabledFor: [GROUP_ROLES.ADMIN, GROUP_ROLES.MODERATOR_DELEGATOR, GROUP_ROLES.MODERATOR]
        },
        {
          id: 'edit',
          label: L('Edit permissions'),
          icon: 'edit',
          enabledFor: [GROUP_ROLES.ADMIN, GROUP_ROLES.MODERATOR_DELEGATOR]
        },
        {
          id: 'remove',
          label: L('Remove'),
          icon: 'trash-alt',
          enabledFor: [GROUP_ROLES.ADMIN, GROUP_ROLES.MODERATOR_DELEGATOR]
        }
      ]

      return list.filter(option => option.enabledFor.includes(this.role))
    }
  },
  methods: {
    onMenuSelect (itemId) {
      console.log('!@# selected', itemId)
    }
  }
}
</script>

<style lang='scss' scoped>
@import "@assets/style/_variables.scss";

.c-permission-action-menu {
  position: relative;
  width: max-content;

  .c-menu-content {
    max-width: 16rem;
    width: max-content;
    top: 100%;
    margin-top: 0.5rem;
    margin-bottom: 1rem;
    left: unset;
    right: 0;
  }
}
</style>
