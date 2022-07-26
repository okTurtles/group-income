<template lang="pug">
menu-parent.c-menu(v-on='listeners')
  menu-trigger.is-small.c-trigger-btn(:aria-label='buttonText')
    | {{ buttonText }}
    i.icon-angle-down.is-suffix

  menu-content.c-menu-content
    ul
      template(v-if='options')
        component(
          v-for='item in options'
          :key='item.id || item.name'
          :is='config.components[item.type]'
          v-bind='propObj(item)'
        ) {{ item.name }}

      slot(v-else)
</template>

<script>
import {
  MenuParent, MenuContent, MenuTrigger, MenuItem, MenuHeader
} from '@components/menu'

export default ({
  name: 'ButtonDropdownMenu',
  components: {
    MenuParent,
    MenuTrigger,
    MenuContent
  },
  props: {
    buttonText: String,
    options: {
      type: Array
      /**
       * NOTE: Shape of the array must strictly follow below statement.
       *
       * - An item to be mapped to a 'menu-item' component:
       *  { type: 'item', id: string, name: string, icon: string }
       *
       * - An item to be mapped to a 'menu-header' component:
       *  { type: 'header', name: string }
       */
    }
  },
  methods: {
    propObj (item) {
      return item.type === 'item'
        ? { tag: 'button', 'item-id': item.id, icon: item.icon }
        : {}
    },
    onItemSelect (itemId) {
      this.$emit('select', itemId)
    }
  },
  data () {
    return {
      config: {
        components: {
          'item': MenuItem,
          'header': MenuHeader
        }
      }
    }
  },
  computed: {
    listeners () {
      return {
        ...this.$listeners,
        select: this.onItemSelect
      }
    }
  }
}: Object)
</script>

<style lang="scss" scoped>
@import "@assets/style/_variables.scss";

.c-menu {
  position: relative;
  width: max-content;

  .c-menu-content {
    min-width: 100%;
    max-width: 16rem;
    width: max-content;
    top: 100%;
    margin-top: 0.5rem;
    margin-bottom: 1rem;
    left: unset;
    right: 0;

    ::v-deep .c-header {
      font: {
        size: $size_5;
        weight: 400;
      }
      color: $text_1;
      line-height: 1rem;
    }

    ::v-deep .c-menuItem {
      &:not(:last-child) {
        margin-bottom: 0.25rem;
      }

      .c-item-link {
        height: 1.875rem;
      }

      i {
        line-height: 1.2rem;
        width: 1.2rem;
        height: 1.2rem;
      }

      i,
      .c-item-slot {
        font-size: $size_4;
      }
    }
  }
}

.c-trigger-btn {
  i {
    transition: transform 250ms ease-in-out;
  }

  &.is-active > i {
    transform: rotate(180deg);
  }
}
</style>
