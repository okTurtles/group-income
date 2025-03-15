<template lang='pug'>
//-  Instead of mounting this component where it is positioned in the component tree,
//-  We teleport it to '<portal-target />' in ChatMain.vue.
//-  This is to avoid an uncanny bug related to 'position: fixed' detailed in https://github.com/okTurtles/group-income/issues/2476

//-  Reference-1: https://dev.to/salilnaik/the-uncanny-relationship-between-position-fixed-and-transform-property-32f6
//-  Reference-2: https://v2.portal-vue.linusb.org/

portal(
  v-if='isActive && options.length'
  to='chat-overlay-target'
)
  transition(name='fade' appear)
    .c-message-actions-mobile
      ul.c-content-wrapper(v-on-clickaway='closeMenu')
        list-item.is-icon-small.c-menu-item(
          v-for='(option, index) in options'
          :key='index'
          tag='button'
          :data-test='option.action'
          @click.stop='onMenuItemClick(option.action, $event)'
        )
          i(:class='`icon-${option.icon}`')
          span {{ option.name }}
</template>

<script>
import { mixin as clickaway } from 'vue-clickaway'
import ListItem from '@components/ListItem.vue'

export default ({
  name: 'MessageActionsMobile',
  inject: ['Menu'],
  mixins: [clickaway],
  components: {
    ListItem
  },
  props: {
    options: Array,
    default: () => []
  },
  methods: {
    closeMenu () {
      this.Menu.closeMenu()
    },
    onMenuItemClick (...args) {
      this.$emit('select', ...args)
      this.closeMenu()
    }
  },
  computed: {
    isActive () {
      return this.Menu.isActive
    }
  }
}: Object)
</script>

<style lang="scss" scoped>
@import "@assets/style/_variables.scss";

.c-message-actions-mobile {
  position: fixed;
  width: 100vw;
  height: 100%;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  padding: 0;
  margin: 0;
  border-radius: 0;
  background-color: rgba(0, 0, 0, 0.7);
  display: flex;
  flex-direction: column-reverse;
  z-index: $zindex-modal;
}

.c-content-wrapper {
  position: relative;
  border-radius: $radius-large $radius-large 0 0;
  background-color: $background;
  z-index: 2;
  padding-top: 0.5rem;
  padding-bottom: 1.25rem;
}

.c-menu-item {
  ::v-deep .c-item-link {
    height: 3.43rem;
    width: 100%;
    font-family: "Lato";

    i {
      color: $general_0;
    }

    &.is-active,
    &:hover,
    &:focus {
      background-color: $general_2;

      &::before {
        content: none;
      }
    }
  }
}
</style>
