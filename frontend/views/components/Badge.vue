<template lang="pug">
span.c-badge(
  :class='`is-${type}`'
  :aria-label='L("{num} new notifications", { num })'
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
    },
    count: {
      // An option to explicitly set the count value intead of passing in a slot:
      // eg) 'compact' type does not present a number in the UI, so it is not necessary to pass it as a slot.
      type: Number,
      default: 0
    }
  },
  computed: {
    num () {
      return this.count > 0
        ? this.count
        : this.$slots.default
          ? this.$slots.default[0].text
          : ''
    }
  }
}: Object)
</script>

<style lang="scss" scoped>
@import "@assets/style/_variables.scss";

.c-badge {
  display: flex;
  position: absolute;
  top: -0.25rem;
  right: -0.25rem;
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
