<template lang="pug">
.c-tooltip
  button.is-unstyled.c-tooltip-trigger-btn(
    type='button'
    :class='{ "trigger-on-hover": triggerOnHover }'
    @click='onClick'
    @blur='onBlur'
  ) {{ char }}

  .tooltip.c-tooltip-content(
    :class='["is-position-" + position, { "is-active": isActive }]') {{ content }}
</template>

<script>
import L from '@common/translations.js'

export default {
  name: 'Tooltip',
  props: {
    content: {
      type: String,
      default: 'tooltip content'
    },
    triggerOnHover: {
      type: Boolean,
      default: true
    },
    char: {
      type: String,
      default: L('i')
    },
    position: {
      type: String,
      default: 'bottom-middle',
      validator: val => ['bottom-left', 'bottom-middle', 'bottom-right'].includes(val)
    }
  },
  data () {
    return {
      isActive: false
    }
  },
  methods: {
    onClick () {
      if (this.triggerOnHover) return

      this.isActive = true
    },
    onBlur () {
      if (!this.triggerOnHover && this.isActive) {
        this.isActive = false
      }
    }
  }
}
</script>

<style lang='scss' scoped>
@import "@assets/style/_variables.scss";

$tooltip-side: 1.175rem;

.c-tooltip {
  position: relative;
  display: inline-block;
  width: max-content;
  height: auto;
  flex-shrink: 0;
}

button.c-tooltip-trigger-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: $tooltip-side;
  height: $tooltip-side;
  border-radius: $tooltip-side;
  padding-top: 0.2rem;
  font-size: 0.815rem;
  font-weight: 600;
  background-color: var(--tooltip-trigger-bg-color);
  border: 1px solid var(--tooltip-trigger-border-color);
  color: var(--tooltip-trigger-text-color);
  text-align: center;
  cursor: pointer;

  &:hover,
  &:focus {
    box-shadow: var(--tooltip-trigger-box-shadow_hover);
  }

  &:active {
    box-shadow: none;
    transition: box-shadow 0ms;
  }

  &.trigger-on-hover:hover,
  &.trigger-on-hover:focus {
    + .c-tooltip-content {
      opacity: 1;
    }
  }
}

.c-tooltip-content {
  transition: opacity 200ms;

  &.is-position-bottom-left {
    left: -0.75rem;
    transform: translateY(100%);
  }

  &.is-position-bottom-right {
    left: unset;
    right: -0.75rem;
    transform: translateY(100%);
  }
}
</style>
