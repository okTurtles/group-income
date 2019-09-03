<template lang="pug">
span.c-badge(:class="`is-${type}`")
  slot
</template>

<script>
export default {
  name: 'NotificationBadge',
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
  $diameter-default: calc(#{$spacer} + 2px);
  $diameter-compact: calc(#{$spacer-sm} + 2px);

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
    width: $diameter-default;
    height: $diameter-default;
    line-height: $diameter-default;
    font-size: 0.7rem;
    font-weight: 600;
  }

  &.is-compact {
    width: $diameter-compact;
    height: $diameter-compact;
    font-size: 0;
  }
}
</style>
