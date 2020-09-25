<template lang='pug'>
.c-chatnav
  template(slot='actions')
    menu-parent
      menu-trigger.is-icon
        i.icon-ellipsis-v

      menu-content.c-actions-content
        ul
          menu-item(tag='button' itemid='hash-1' icon='heart')
            i18n Settings
          menu-item(tag='button' itemid='hash-2' icon='heart' hasdivider='')
            i18n Mute chat
          menu-item(tag='button' itemid='hash-3' icon='heart')
            i18n Report a problem

  .c-chatnav-body
    slot

</template>

<script>
import MainHeader from './MainHeader.vue'
import { MenuParent, MenuTrigger, MenuContent, MenuItem } from '@components/menu/index.js'

export default {
  name: 'ChatNav',
  components: {
    MainHeader,
    MenuParent,
    MenuTrigger,
    MenuContent,
    MenuItem
  },
  data () {
    return {
      ephemeral: {}
    }
  },
  computed: {},
  methods: {}
}
</script>

<style lang="scss" scoped>
@import "@assets/style/_variables.scss";

.c-chatnav {
  .c-actions-content {
    top: 2rem;
    right: 0;
    left: auto;
    min-width: 10rem;
  }

  ::v-deep .c-item-link {
    padding: 1.25rem 0.5rem;
    margin: 0.25rem 0 0.25rem -0.5rem;
    border-radius: $radius;

    i {
      margin-right: 0.5rem;
    }

    &.is-active {
      background: $white;

      &::before {
        display: none;
      }
    }
  }

  ::v-deep .c-avatar {
    margin-right: 0.5rem;
  }
}

@include phone {
  .c-chatnav {
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    max-height: 100vh;
    overflow: auto;
  }
}
</style>
