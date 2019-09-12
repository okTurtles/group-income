<template lang="pug">
// :aria-label=
span.c-badge(
  :class='`is-${type}`'
  :aria-label='L("New notifications", undefined, { num: $slots.default ? $slots.default[0].text : "" })'
  role='alert'
)
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
  display: flex;
  justify-content: center;
  align-items: center;

  &.is-default {
    top: -$spacer-xs;
    right: -$spacer-xs;
    color: $background;
    width: $spacer;
    height: $spacer;
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
