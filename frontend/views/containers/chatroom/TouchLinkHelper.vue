<template lang='pug'>
.c-touch-link-helper
</template>

<script>
export default ({
  name: 'TouchLinkHelper'
}: Object)
</script>

<style lang="scss" scoped>
@import "@assets/style/_variables.scss";

.c-touch-link-helper {
  position: fixed;
  top: 0;
  z-index: $zindex-tooltip;
  left: 0;
  width: 100%;
  height: 0;
  pointer-events: none;
  overflow: hidden;

  &.is-active {
    pointer-events: initial;
    height: 100%;
  }
}
</style>
