<template lang="pug">
.switch-toggle(:class='{ "is-disabled": disabled || loading, "is-on": value }')
  input.toggle-input(type='checkbox' :checked='value' @change='onChange')

  span.toggle-track
    span.toggle-thumb
</template>

<script>
export default {
  name: 'ToggleSwitch',
  props: {
    value: {
      type: Boolean,
      required: true
    },
    disabled: Boolean,
    loading: Boolean
  },
  methods: {
    onChange () {
      this.$emit('input', !this.value)
    }
  }
}
</script>

<style lang="scss" scoped>
@import "@assets/style/_variables.scss";

$thumb-side: 1.25rem;
$track-width: $thumb-side * 2 + 0.125rem;

.switch-toggle {
  position: relative;
  display: inline-flex;
  height: auto;
  width: max-content;
  padding: 0.25rem;
  border-radius: 2rem;
  border: 1px solid var(--toggle-switch-border-color);
  background-color: var(--toggle-switch-bg-color);
  transition: all 120ms ease-out;

  input.toggle-input {
    position: absolute;
    width: 100%;
    height: 100%;
    opacity: 0;
    cursor: pointer;
    z-index: 1;
  }

  .toggle-track {
    position: relative;
    display: inline-block;
    width: $track-width;
    height: $thumb-side;
  }

  .toggle-thumb {
    position: absolute;
    width: $thumb-side;
    height: $thumb-side;
    top: 0;
    left: 0;
    border-radius: 50%;
    background-color: var(--toggle-switch-thumb-color);
    transition: all 120ms ease-out;
    transform: translateX(0);
  }

  &.is-on {
    background-color: var(--toggle-switch-bg-color_active);

    .toggle-thumb {
      transform: translateX(100%);
    }
  }

  &.is-disabled {
    opacity: 0.425;
    pointer-events: none;
  }

  &:hover,
  &:focus {
    border-color: var(--toggle-switch-border-color_focus);
  }
}

:root[data-theme="dark"] {
  .switch-toggle.is-disabled {
    opacity: 0.57;
  }
}
</style>
