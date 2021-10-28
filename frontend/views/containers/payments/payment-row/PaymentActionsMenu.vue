<template lang='pug'>
  menu-parent.c-menu
    menu-trigger.is-icon-small(:aria-label='L("Payment actions")')
      i.icon-ellipsis-v
    menu-content
      ul
        slot
</template>

<script>
import { MenuParent, MenuTrigger, MenuContent, MenuItem } from '@components/menu/index.js'

export default ({
  name: 'PaymentNotReceivedTooltip',
  components: {
    MenuParent,
    MenuTrigger,
    MenuContent,
    MenuItem
  },
  props: {
    member: String
  }
}: Object)
</script>

<style lang="scss" scoped>
@import "@assets/style/_variables.scss";

.c-menu {
  margin-left: 1rem;
}

.c-menu ::v-deep .c-content {
  width: 13.375rem;
  left: -12rem;
  top: 2rem;
}
</style>
