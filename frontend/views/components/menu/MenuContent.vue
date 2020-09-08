<template lang='pug'>
.c-content(:class='{ "is-active": isActive }' data-test='menuContent')
  .c-content-wrapper(
    v-if='isActive'
    v-on-clickaway='closeMenu'
  )
    slot
</template>

<script>
import { mixin as clickaway } from 'vue-clickaway'

export default {
  name: 'MenuOptions',
  mixins: [
    clickaway
  ],
  inject: ['Menu'],
  computed: {
    isActive () {
      return this.Menu.isActive
    }
  },
  methods: {
    closeMenu () {
      this.Menu.closeMenu()
    }
  }
}
</script>

<style lang="scss" scoped>
@import "@assets/style/_variables.scss";

.c-content-wrapper {
  min-height: 100%;
}

.c-content {
  position: absolute;
  top: 0;
  left: 0.5rem;
  right: 0.5rem;
  z-index: 2;
  border-radius: $radius;
  background-color: $background;
  box-shadow: 0px 0.5rem 1.25rem rgba(54, 54, 54, 0.3);
  max-height: 0;
  opacity: 0;
  overflow: hidden;
  pointer-events: none;
  padding-bottom: 0.5rem;
  padding-top: 0.5rem;

  &.is-active {
    // Is that enought for every menu?
    // Should we use mask transition instead?
    pointer-events: initial;
    max-height: 25rem;
    opacity: 1;
    transition: max-height cubic-bezier(0.25, 0.46, 0.45, 0.94) 1s 100ms, opacity cubic-bezier(0.25, 0.46, 0.45, 0.94) 300ms 100ms;
  }

  ::v-deep .c-item {
    padding: 0;
  }

  ::v-deep .c-item-link {
    width: 100%;

    i {
      margin-right: 0.5rem;
    }
  }
}

.is-dark-theme .c-content {
  background-color: var(--general_1);
}

</style>
