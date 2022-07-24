<template lang="pug">
menu-parent.c-menu(v-on='$listeners')
  menu-trigger.is-small.c-trigger-btn(:aria-label='buttonText')
    | {{ buttonText }}
    i.icon-angle-down.is-suffix

  menu-content.c-menu-content
    ul
      slot
</template>

<script>
import {
  MenuParent, MenuContent, MenuTrigger
} from '@components/menu'

export default ({
  name: 'ButtonDropdownMenu',
  components: {
    MenuParent,
    MenuTrigger,
    MenuContent
  },
  props: {
    buttonText: String
  }
}: Object)
</script>

<style lang="scss" scoped>
.c-menu {
  width: max-content;
}

.c-trigger-btn {
  i {
    transition: transform 250ms ease-in-out;
  }
  &.is-active > i {
    transform: rotate(180deg);
  }
}

.c-menu-content {
  min-width: 100%;
  max-width: 16rem;
  width: max-content;
  top: 100%;
  margin-top: 0.5rem;
  left: unset;
  right: 0;
}
</style>
