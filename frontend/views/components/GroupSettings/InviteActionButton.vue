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
        i.icon-vote-yea.c-icon
        | See original proposal
      menu-item(
        tag='router-link'
        item-id='hash-3'
        v-if='!linkExpired'
        to='/somewhere'
      )
        i.icon-times.c-icon
        | Revoke link
</template>

<script>
import { MenuParent, MenuTrigger, MenuContent, MenuItem } from '@components/Menu/index.js'

export default {
  name: 'inviteActionButton',
  components: {
    MenuParent,
    MenuTrigger,
    MenuContent,
    MenuItem
  },
  props: {
    linkExpired: {
      type: Boolean,
      default: false
    }
  }
}
</script>

<style lang='scss' scoped>
@import '../../../assets/style/_variables.scss';

.c-content {
  width: 13.375rem;
  margin-top: 3.5rem;
  margin-left: -0.5rem;
}

.c-icon {
  color: $general_0;
  margin-right: 16px;
}
</style>
