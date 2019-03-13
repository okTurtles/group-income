<template>
  <div class="c-content" :class="{ 'is-active': isActive }">
    <div v-if="isActive" v-on-clickaway="closeMenu" class="c-content-wrapper">
      <slot></slot>
    </div>
  </div>
</template>
<style lang="scss" scoped>
@import "../../../assets/sass/theme/index";

.c-content-wrapper {
  min-height: 100%;
}

.c-content {
  position: absolute;
  top: 0;
  left: $gi-spacer-sm;
  right: $gi-spacer-sm;
  z-index: 2;
  border-radius: $radius;
  background-color: $body-background-color;
  box-shadow: 0 0.125rem 0.25rem $grey;
  max-height: 0;
  opacity: 0;
  overflow: hidden;
  pointer-events: none;

  &.is-active {
    // Is that enought for every menu?
    // Should we use mask transition instead?
    pointer-events: initial;
    max-height: 400px;
    opacity: 1;
    transition: max-height cubic-bezier(0.25, 0.46, 0.45, 0.94) 1s 100ms, opacity cubic-bezier(0.25, 0.46, 0.45, 0.94) 300ms 100ms;
  }
}
</style>
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
