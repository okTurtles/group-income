<template lang='pug'>
.c-touch-link-helper
  .c-overlay-background

  .c-panel-content
    i18n Random content
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

.c-overlay-background {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.7);
  z-index: 0;
  opacity: 0;
  transition: opacity 300ms linear;

  .is-active & {
    opacity: 1;
  }
}

.c-panel-content {
  position: absolute;
  bottom: 0;
  left: 0;
  width: 100%;
  height: max-content;
  border-radius: 1rem 1rem 0 0;
  background-color: $general_2;
  padding: 2rem 1rem;
}
</style>
