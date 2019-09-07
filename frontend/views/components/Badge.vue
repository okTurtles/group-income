<template lang="pug">
span.c-badge(:class="`is-${type}`")
  slot
</template>

<script>
export default {
  name: 'Badge',
  props: {
    type: {
      default: 'default',
      validator: (type) => ['default', 'compact'].indexOf(type) !== -1
    }
  }
}
</script>

<style lang="scss" scoped>
@import "../../assets/style/_variables.scss";

.c-badge {
  position: absolute;
  background-color: $danger_0;
  border: 1px solid $background;
  border-radius: 50%;
  top: 0;
  right: 0;

  &.is-default {
    top: -4px;
    right: -4px;
    color: $background;
    width: $spacer;
    height: $spacer;
    text-align: center;
    line-height: 15px;
    font-size: 0.7rem;
    font-weight: normal;
  }

  &.is-compact {
    width: $spacer-sm;
    height: $spacer-sm;
    font-size: 0;
  }
}
</style>
