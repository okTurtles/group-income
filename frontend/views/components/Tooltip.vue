<template lang='pug'>
span.c-wrapper(
  tabindex='0'
  @mouseenter='show'
  @mouseleave='hide'
  @focus='show'
  @blur='hide'
  aria-label='text'
)
  slot
  .c-tooltip(
    :style='stylesPosition'
    v-if='isActive || shouldShow'
    v-append-to-body=''
  )
    template(v-if='text') {{text}}
    slot(v-else='' name='tooltip')
</template>

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
    text: String,
    // Force to show tooltip manually
    shouldShow: Boolean,
    direction: {
      type: String,
      validator: (value) => ['bottom', 'bottom-end', 'right', 'right-start', 'top'].includes(value),
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
      this.trigger = this.$el.getBoundingClientRect()
      const { scrollX, scrollY } = window
      const { width, height, left, top } = this.trigger
      const spacing = 16
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
      } else if (this.direction === 'bottom-end') {
        x = scrollX + left + width - this.tooltip.width
        y = scrollY + top + height + spacing
      } else if (this.direction === 'top') {
        x = scrollX + left + width / 2 - this.tooltip.width / 2
        y = scrollY + top - (this.tooltip.height + spacing)
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
      inserted (el, bindings, vnode) {
        document.body.appendChild(el)

        const $this = vnode.context // Vue component instance

        if (!$this.tooltip) {
          $this.tooltip = el.getBoundingClientRect()
        }

        // That way the adjustPosition() method can have the same logic
        // applied in every tooltip as expected
        $this.adjustPosition()
      },
      unbind (el) {
        if (el.parentNode) {
          el.parentNode.removeChild(el)
        }
      }
    }
  }
}
</script>

<style lang="scss" scoped>
@import "../../assets/style/_variables.scss";

.c-wrapper {
  cursor: pointer;
}

.c-tooltip {
  position: absolute;
  top: 0;
  left: 0;
  min-width: 3rem;
  max-width: 12rem;
  border-radius: $radius;
  padding: $spacer-sm;
  opacity: 0.95;
  z-index: $zindex-tooltip;
  pointer-events: none;
  background-color: $text_0;
  color: #fff;
}
</style>
