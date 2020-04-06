<template lang='pug'>
span.c-twrapper(
  tabindex='0'
  @click='toggle'
  @mouseenter='show'
  @mouseleave='hide'
  @focus='show'
  @blur='hide'
  aria-label='text'
)
  slot

  .c-background(
    v-if='(isActive || isVisible) && manual'
    @click='toggle'
    v-append-to-body=''
  )
  .c-tooltip(
    :style='styles'
    :class='isTextCenter ? "has-text-center" : ""'
    v-if='isActive || isVisible'
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
    isVisible: Boolean,
    manual: {
      type: Boolean,
      default: false
    },
    isTextCenter: Boolean,
    direction: {
      type: String,
      validator: (value) => ['bottom', 'bottom-end', 'right', 'left', 'top'].includes(value),
      default: 'bottom'
    }
  },
  data: () => ({
    trigger: null,
    tooltip: null,
    tooltipHeight: 0,
    tooltipWidth: 0,
    isActive: false,
    styles: null
  }),
  mounted () {
    window.addEventListener('resize', this.adjustPosition)
  },
  beforeDestroy: function () {
    window.removeEventListener('resize', this.adjustPosition)
  },
  methods: {
    show () {
      if (!this.manual) this.isActive = true
    },
    hide () {
      if (!this.manual) this.isActive = false
    },
    toggle () {
      this.isActive = !this.isActive
    },
    adjustPosition () {
      this.trigger = this.$el.getBoundingClientRect()
      console.log(this.trigger)
      const { scrollX, scrollY } = window
      const { width, height, left, top } = this.trigger
      const spacing = 16
      let x
      let y = scrollY + top + height / 2 - this.tooltipHeight / 2
      if (y < 0) y = spacing
      if (y + this.tooltipHeight > window.innerHeight) y = window.innerHeight - spacing - this.tooltipHeight

      // TODO/BUG: If the tooltip transpasses the window edges, it get's cutted.
      // In the future it must be smart enough to adjust its position.
      switch (this.direction) {
        case 'right':
          x = scrollX + left + width + spacing
          break
        case 'left':
          x = scrollX + left - spacing - this.tooltipWidth
          break
        case 'bottom-end':
          x = scrollX + left + width - this.tooltipWidth
          y = scrollY + top + height + spacing
          break
        case 'top':
          x = scrollX + left + width / 2 - this.tooltipWidth / 2
          y = scrollY + top - (this.tooltipHeight + spacing)
          break
        default: // 'bottom' as default
          x = scrollX + left + width / 2 - this.tooltipWidth / 2
          y = scrollY + top + height + spacing
      }

      this.styles = {
        transform: `translate(${x}px, ${y}px)`,
        pointerEvents: this.manual ? 'initial' : 'none',
        backgroundColor: this.manual ? 'transparent' : 'var(--text_0)'
      }
    }
  },
  directives: {
    // The tooltip instead of being rendered on the original DOM position
    // it's appended to the DOM, away from every other elements
    // so no element CSS can influence tooltip styles (position, size)
    appendToBody: {
      inserted (el, bindings, vnode) {
        document.body.appendChild(el)
        if (el.className === 'c-tooltip') {
          const $this = vnode.context // Vue component instance
          if (!$this.tooltip) {
            $this.tooltip = el.getBoundingClientRect()
          }

          if (!$this.tooltipWidth) {
            if ($this.$slots.tooltip) {
              const elm = $this.$slots.tooltip[0].elm
              if (elm.offsetWidth) {
                $this.tooltipWidth = elm.offsetWidth
                $this.tooltipHeight = elm.offsetHeight
              }
            } else {
              const elm = el.getBoundingClientRect()
              $this.tooltipWidth = elm.width
              $this.tooltipHeight = elm.height
            }
          }

          // That way the adjustPosition() method can have the same logic
          // applied in every tooltip as expected
          $this.adjustPosition()
        }
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
@import "@assets/style/_variables.scss";

.c-twrapper {
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
  z-index: $zindex-tooltip;
  color: #fff;
  opacity: 0.95;

  &.has-text-center {
    text-align: center;
  }
}

.c-background {
  position: absolute;
  z-index: $zindex-tooltip - 1;
  width: 100%;
  height: 100%;
  top: 0;
  left: 0;
}
</style>
