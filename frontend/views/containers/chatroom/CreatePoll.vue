<template lang="pug">
.c-create-poll(:class='{ "is-active": ephemeral.isActive }')
  .c-create-poll-wrapper
</template>

<script>
export default {
  name: 'CreatePoll',
  data () {
    return {
      ephemeral: {
        isActive: false
      }
    }
  }
}
</script>

<style lang="scss" scoped>
@import "@assets/style/_variables.scss";

.c-create-poll {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 0;
  pointer-events: none;
  overflow: hidden;
  z-index: $zindex-tooltip;

  &.is-active {
    pointer-events: initial;
    height: 100%;
  }
}

.c-create-poll-wrapper {
  position: absolute;
  pointer-events: inherit;
}
</style>
