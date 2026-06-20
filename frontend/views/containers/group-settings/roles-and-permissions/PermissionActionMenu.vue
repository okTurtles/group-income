<template lang='pug'>
menu-parent.c-permission-action-menu(
  @select='onMenuSelect'
)
  menu-trigger.is-icon-small.c-trigger-btn(:aria-label='L("Open permission action menu")')
    i.icon-ellipsis-v

  menu-content.c-menu-content
    ul
      menu-item.c-menu-item(
        v-for='option in config.menuOptions'
        tag='button'
        :key='option.id'
        :item-id='option.id'
        :icon='option.icon'
      ) {{ option.label }}
</template>

<script>
import { L } from '@common/common.js'
import { MenuParent, MenuContent, MenuTrigger, MenuItem } from '@components/menu'

export default {
  name: 'PermissionActionMenu',
  components: {
    MenuParent,
    MenuContent,
    MenuTrigger,
    MenuItem
  },
  data () {
    return {
      config: {
        menuOptions: [
          {
            id: 'edit',
            label: L('Edit permissions'),
            icon: 'edit'
          },
          {
            id: 'remove',
            label: L('Remove role'),
            icon: 'trash-alt'
          }
        ]
      }
    }
  },
  methods: {
    onMenuSelect (actionName) {
      this.$emit(actionName)
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
