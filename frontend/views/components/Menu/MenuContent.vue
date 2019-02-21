<template>
  <div class="c-content" v-if="isActive" v-on-clickaway="closeMenu">
    <slot></slot>
  </div>
</template>
<style lang="scss" scoped>
@import "../../../assets/sass/theme/index";

.c-content {
  position: absolute;
  top: 0;
  left: $gi-spacer-sm;
  right: $gi-spacer-sm;
  width: auto;
  z-index: 2;
  border-radius: $radius;
  background-color: $body-background-color;
  box-shadow: 0 0.125rem 0.25rem $grey;
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
