<template lang="pug">
span.c-badge(
  :class='`is-${type}`'
  :aria-label='L("{num} new notifications", { num: $slots.default ? $slots.default[0].text : "" })'
  role='alert'
)
  slot
</template>

<script>
export default ({
  name: 'Badge',
  props: {
    type: {
      default: 'default',
      validator: (type) => ['default', 'compact'].indexOf(type) !== -1
    }
  }
}: Object)
</script>

<style lang="scss" scoped>
@import "@assets/style/_variables.scss";

.c-badge {
  position: absolute;
  background-color: $danger_0;
  border: 1px solid $background;
  border-radius: 50%;
  top: 0;
  right: 0;
  display: flex;
  justify-content: center;
  align-items: center;

  &.is-default {
    top: -0.25rem;
    right: -0.25rem;
    color: $background;
    width: 1rem;
    height: 1rem;
    font-size: 0.7rem;
    font-weight: normal;
    line-height: 0.2; // force pixel alignment on Chrome
  }

  &.is-compact {
    width: 0.5rem;
    height: 0.5rem;
    font-size: 0;
  }
}
</style>
