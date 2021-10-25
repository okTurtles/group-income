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
  display: flex;
  position: absolute;
  align-items: center;
  background-color: $danger_0;
  border: 1px solid $background;
  border-radius: 50%;
  color: $background;
  font-size: 0.7rem;
  font-weight: 600;
  justify-content: center;
  height: 1rem;
  line-height: 0.2; // Force pixel alignment in Chrome.
  min-width: 1rem; // Allow expansion when several digits must be displayed.
  padding: 0 2px 1px 1px; // Prevent contents from touching rounded corners.

  &.is-compact {
    top: 0;
    right: 0;
    min-width: 0.5rem;
    height: 0.5rem;
    font-size: 0;
  }
}
</style>
