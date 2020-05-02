<template lang='pug'>
span.c-twrapper(
  :tabindex='manual ? "-1" : "0"'
  @click='toggle'
  @mouseenter='show'
  @mouseleave='hide'
  @focus='show'
  @blur='hide'
  :aria-label='text'
)
  slot

  transition(name='fade')
    .c-background(
      v-if='(isActive || isVisible) && manual'
      @click='toggle'
      v-append-to-body=''
    )

  .c-tooltip(
    :style='styles'
    :class='{"has-text-center": isTextCenter, "is-active": isActive, manual}'
    v-if='isActive || isVisible'
    v-append-to-body='{ manual }'
  )
    // Default tooltip is text
    template(v-if='text') {{text}}
    // But any content can fit in
    slot(v-else='' name='tooltip')
</template>

<script>
import { TABLET } from '@view-utils/breakpoints.js'
import trapFocus from '@utils/trapFocus.js'

export default {
  name: 'Tooltip',
  mixins: [trapFocus],
  props: {
    text: String,
    // Force to show tooltip manually
    isVisible: Boolean,
    manual: {
      type: Boolean,
      default: false
    },
    isTextCenter: {
      type: Boolean,
      default: false
    },
    direction: {
      type: String,
      validator: (value) => ['bottom', 'bottom-end', 'right', 'left', 'top', 'top-left'].includes(value),
      default: 'bottom'
    },
    opacity: {
      type: Number,
      required: false,
      default: 0.95
    }
  },
  data: () => ({
    trigger: null,
    tooltip: null,
    tooltipHeight: 0,
    tooltipWidth: 0,
    isActive: false,
    styles: null,
    lastFocus: null
  }),
  methods: {
    show () {
      if (!this.manual) this.isActive = true
    },
    hide () {
      if (!this.manual) this.isActive = false
    },
    // Used by parent (ProfileCard.vue)
    toggle () {
      if (!this.manual) { return false }
      this.isActive = !this.isActive
    },
    trapFunction (e) {
      this.trapFocus(e, this.$slots.tooltip[0].elm)
    },
    adjustPosition () {
      this.trigger = this.$el.getBoundingClientRect()
      const { scrollX, scrollY } = window
      const { width, height, left, top } = this.trigger
      const windowHeight = window.innerHeight
      const spacing = 16
      let x, y

      if (this.manual && window.innerWidth < TABLET) {
        y = windowHeight - this.tooltipHeight // Position at the bottom of the screen on mobile
        x = -8 // Remove tooltip padding
      } else {
        y = scrollY + top + height / 2 - this.tooltipHeight / 2
        if (y < 0) y = spacing
        if (y + this.tooltipHeight > windowHeight) y = windowHeight - spacing - this.tooltipHeight

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
          case 'top-left':
            y = y - height - spacing
            x = scrollX + left + spacing
            break
          default: // 'bottom' as default
            x = scrollX + left + width / 2 - this.tooltipWidth / 2
            y = scrollY + top + height + spacing
        }
      }

      this.styles = {
        transform: `translate(${x}px, ${y}px)`,
        pointerEvents: this.manual ? 'initial' : 'none',
        backgroundColor: this.manual ? 'transparent' : 'var(--text_0)',
        opacity: this.opacity
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
        window.addEventListener('resize', $this.adjustPosition)

        if (bindings.value && bindings.value.manual) {
          document.addEventListener('keydown', e => $this.trapFocus(e, el))
          $this.lastFocus = document.activeElement
          $this.focusEl(el)
        }
      },
      unbind (el, bindings, vnode) {
        if (el.parentNode) {
          el.parentNode.removeChild(el)
        }
        if (bindings.value && bindings.value.manual) {
          const $this = vnode.context
          document.removeEventListener('keydown', e => $this.trapFocus(e, el))
          // move focus to latest focused element before opening the tooltip.
          $this.lastFocus.focus()
        }
        window.removeEventListener('resize', this.adjustPosition)
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
  padding: 0.5rem;
  z-index: $zindex-tooltip;
  color: #fff;

  &.has-text-center {
    text-align: center;
  }

  &.manual {
    max-width: auto;
  }

  &:focus {
    outline: none; // TODO #889
  }
}

.c-background {
  position: absolute;
  z-index: $zindex-tooltip - 1;
  width: 100%;
  height: 100%;
  top: 0;
  left: 0;

  @include phone {
    background-color: rgba(0, 0, 0, 0.7);
  }
}
</style>
