<template lang='pug'>
button.c-toggle.is-unstyled(@click='$emit("toggle")')
  i.icon-bars(v-if='element === "navigation"' aria-label='Navigation - Popup button')
  i.icon-info(v-else aria-label='Sidebar - Popup button')
</template>

<script>
export default {
  name: 'Toggle',
  props: {
    element: {
      type: String,
      default: 'navigation'
    }
  }
}
</script>
<style lang="scss" scoped>
@import "@assets/style/_variables.scss";
@import "@assets/style/_mixins.scss";

$speed: 300ms;
.c-toggle {
  @extend %reset-button;
  position: absolute;
  top: 0;
  padding: $spacer*1.1 0 $spacer;
  width: 2.8rem;
  text-align: left;
  background-color: transparent;
  transition: height 1ms $speed, width 1ms $speed, background $speed/2;
  overflow: hidden;
  color: $text_0;

  .icon-bars {
    margin-left: $spacer;
    transition: opacity $speed/5 $speed;
    // TODO/OPTIMIZE review this toogle appearance
  }

  .is-active & {
    background-color: rgba(0, 0, 0, 0.7);
    height: 100vh;
    width: 200vh;
    top: 0;
    transition: height 1ms 1ms, width 1ms 1ms, background $speed/2;

    .icon-ellipsis-v,
    .icon-bars {
      transition: opacity 1ms 1ms;
      opacity: 0;
    }
  }
}
</style>
