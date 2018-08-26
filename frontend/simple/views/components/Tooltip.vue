<template>
  <span @mouseenter="show" @mouseleave="hide">
    <slot></slot>
    <div
      class="has-background-dark has-text-grey-lighter is-bottom is-size-7 c-tooltip"
      :style="stylesPosition"
      v-if="isActive"
      v-append-to-body
    >
      <slot name="tooltip"></slot>
    </div>
  </span>
</template>
<style lang="scss" scoped>
@import "../../assets/sass/theme/index";

.c-wrapper {
  display: inline-block;
}

.c-tooltip {
  position: absolute;
  top: 0;
  left: 0;
  border-radius: $radius;
  padding: $gi-spacer-sm;
  opacity: 0.95;
  // TODO create SCSS variables with possible z-index (hover,modals, header, etc...)
  // So we don't end up with 99999999 values
  z-index: 50;
  max-width: 12rem;
}
</style>
<script>
/*
NOTE: when needed, this component can be improved with more options:
- Click instead of hover
- More directions
- Controlled tooltip from outside
For now I've just did the needed API for this particular task but I think it's pretty easy to scale it.
*/
export default {
  name: 'Tooltip',
  props: {
    direction: {
      type: String,
      default: 'bottom'
    }
  },
  data: () => ({
    trigger: null,
    tooltip: null,
    isActive: false,
    stylesPosition: null
  }),
  methods: {
    show () {
      this.isActive = true
    },
    hide () {
      this.isActive = false
    },
    adjustPosition () {
      const { scrollX, scrollY } = window
      const { width, height, left, top } = this.trigger || this.$el.getBoundingClientRect()
      const spacing = 5
      let x
      let y

      // TODO/BUG: If the tooltip transpasses the window edges, it get's cutted.
      // In the future it must be smart enough to adjust its position.
      if (this.direction === 'right') {
        x = scrollX + left + width + spacing
        y = scrollY + top + height / 2 - this.tooltip.height / 2
      } else if (this.direction === 'right-start') {
        x = scrollX + left + width + spacing
        y = scrollY + top
      } else { // 'bottom' as default
        x = scrollX + left + width / 2 - this.tooltip.width / 2
        y = scrollY + top + height + spacing
      }

      this.stylesPosition = `transform: translate(${x}px, ${y}px)`
    }
  },
  directives: {
    // The tooltip instead of being rendered on the original DOM position
    // it's appended to the DOM, away from every other elements
    // so no element CSS can influence tooltip styles (position, size)
    appendToBody: {
      inserted: function (el, bindings, vnode) {
        document.body.appendChild(el)

        const $this = vnode.context // Vue component instance

        if (!$this.tooltip) {
          $this.tooltip = el.getBoundingClientRect()
        }

        // That way the adjustPosition() method can have the same logic
        // applied in every tooltip as expected
        $this.adjustPosition()
      }
    }
  }
}
</script>
