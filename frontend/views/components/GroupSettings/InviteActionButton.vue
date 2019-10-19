<template lang="pug">
menu-parent
  menu-trigger.is-icon
    i.icon-ellipsis-v

  menu-content.c-content
    ul
      menu-item(
        tag='router-link'
        item-id='hash-3'
        to='/somewhere'
      )
        i18n.icon-vote-yea.c-icon(tag='i') See original proposal
      menu-item(
        v-if='!linkExpired'
        tag='router-link'
        item-id='hash-3'
        to='/somewhere'
      )
        i18n.icon-times.c-icon(tag='i') Revoke Link
</template>

<script>
import { MenuParent, MenuTrigger, MenuContent, MenuItem } from '@components/Menu/index.js'

export default {
  name: 'InviteLinksActionButton',
  components: {
    MenuParent,
    MenuTrigger,
    MenuContent,
    MenuItem
  },
  props: {
    linkExpired: Boolean
  }
}
</script>

<style lang='scss' scoped>
@import '../../../assets/style/_variables.scss';

.c-content {
  min-width: 13.375rem;
  width: max-content;
  margin: 3.5 * $spacer 0 0 3 * $spacer;
  transform: translateX(-100%);
}

.c-icon {
  text-align: left;
  font-size: $size-4;
  margin: 0;

  &::before {
    color: $general_0;
    margin-right: $spacer;
  }
}
</style>
