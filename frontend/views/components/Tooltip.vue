<template lang='pug'>
span.c-twrapper(
  :class='{ "has-target-within": triggerElementSelector }'
  v-bind='rootElAttrs'
)
  slot

  transition(name='fade')
    .c-background(
      v-if='(isActive || isVisible) && manual'
      @click='toggle'
      v-append-to-page=''
      data-test='closeProfileCard'
    )

  .c-tooltip(
    :style='styles'
    :class='{"has-text-center": isTextCenter, "is-active": isActive, manual, "is-dark-theme": $store.getters.isDarkTheme,  "in-reduced-motion": isReducedMotionMode }'
    v-if='isActive || isVisible'
    v-append-to-page='{ manual }'
  )
    // Default tooltip is text
    template(v-if='text') {{text}}
    // But any content can fit in
    slot(v-else='' name='tooltip')
</template>

<script>
import { mapGetters } from 'vuex'
import { TABLET } from '@view-utils/breakpoints.js'
import trapFocus from '@utils/trapFocus.js'

export default ({
  name: 'Tooltip',
  mixins: [trapFocus],
  props: {
    text: String,
    // Force to show tooltip manually
    isVisible: Boolean,
    manual: {
      // The option to opt out of the default behaviour of displaying tooltip when the trigger element is focused/hovered
      // and then using $ref.[name].toggle() from the parent component instead. (reference: ProfileCard.vue)
      type: Boolean,
      default: false
    },
    isTextCenter: {
      type: Boolean,
      default: false
    },
    direction: {
      type: String,
      validator: (value) => ['bottom', 'bottom-left', 'bottom-right', 'right', 'left', 'top', 'top-left'].includes(value),
      default: 'bottom'
    },
    opacity: {
      type: Number,
      required: false,
      default: 0.95
    },
    deactivated: {
      type: Boolean,
      default: false
    },
    triggerElementSelector: {
      // Instead of taking the entire 'default-slot' as the trigger element(which is the default behaviour of this component),
      // specifying this prop will bind the tooltip to 'a particular element within the default-slot' content.
      // The value must be a valid css-selector string, which will be used in searching via HTMLElement.querySelector()
      // (Refer to GroupMembersActivity.vue for the use case.)
      type: String,
      required: false,
      default: ''
    }
  },
  data: () => ({
    triggerDOM: null,
    trigger: null, // bounding-box info of the trigger DOM.
    tooltip: null,
    tooltipHeight: 0,
    tooltipWidth: 0,
    isActive: false,
    styles: null,
    lastFocus: null
  }),
  computed: {
    ...mapGetters([
      'isReducedMotionMode'
    ]),
    rootElAttrs () {
      return {
        'tabindex': !this.triggerElementSelector
          ? (this.manual ? '-1' : '0')
          : null,
        'aria-label': !this.triggerElementSelector ? this.text : undefined
      }
    }
  },
  methods: {
    show () {
      if (!this.manual && !this.deactivated) this.isActive = true
    },
    hide () {
      if (!this.manual) this.isActive = false
    },
    toggle () {
      // Manually toggle on/off the tooltip (reference: ProfileCard.vue)
      if (this.deactivated || !this.manual) { return }
      this.isActive = !this.isActive
    },
    handleKeyUp (e) {
      // Close after pressing escape
      if (e.key === 'Escape') {
        this.isActive = false
      }
    },
    adjustPosition () {
      this.trigger = (this.triggerDOM || this.$el).getBoundingClientRect()
      const pageEl = document.querySelector('#app .l-page')

      const { scrollLeft = 0, scrollTop = 0 } = pageEl
      const scrollX = window.scrollX + scrollLeft
      const scrollY = window.scrollY + scrollTop

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
          case 'bottom-left':
            x = scrollX + left
            y = scrollY + top + height + spacing
            break
          case 'bottom-right':
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
    // it's appended to the 'div.l-page' page element, away from every other elements
    // so no element CSS can influence tooltip styles (position, size)
    appendToPage: {
      inserted (el, bindings, vnode) {
        const pageEl = document.querySelector('#app .l-page')
        pageEl.appendChild(el)

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
          $this.focusedElement = el
          document.addEventListener('keydown', $this.trapFocus)
          window.addEventListener('keyup', $this.handleKeyUp)
          $this.lastFocus = document.activeElement
          $this.focusEl(el)
        }
      },
      unbind (el, bindings, vnode) {
        const $this = vnode.context
        if (el.parentNode) {
          el.parentNode.removeChild(el)
        }
        if (bindings.value && bindings.value.manual) {
          $this.focusedElement = null
          document.removeEventListener('keydown', $this.trapFocus)
          window.removeEventListener('keyup', $this.handleKeyUp)
          // move focus to latest focused element before opening the tooltip.
          $this.lastFocus.focus()
        }
        window.removeEventListener('resize', $this.adjustPosition)
      }
    }
  },
  mounted () {
    this.triggerDOM = this.triggerElementSelector ? this.$el.querySelector(this.triggerElementSelector) : this.$el

    this.triggerDOM.addEventListener('click', this.toggle)
    this.triggerDOM.addEventListener('mouseenter', this.show)
    this.triggerDOM.addEventListener('mouseleave', this.hide)
    this.triggerDOM.addEventListener('focus', this.show)
    this.triggerDOM.addEventListener('blur', this.hide)

    if (this.triggerElementSelector) {
      this.triggerDOM.style.cursor = 'pointer'
    }
  },
  beforeDestory () {
    this.triggerDOM.removeEventListener('click', this.toggle)
    this.triggerDOM.removeEventListener('mouseenter', this.show)
    this.triggerDOM.removeEventListener('mouseleave', this.hide)
    this.triggerDOM.removeEventListener('focus', this.show)
    this.triggerDOM.removeEventListener('blur', this.hide)
  }
}: Object)
</script>

<style lang="scss" scoped>
@import "@assets/style/_variables.scss";

.c-twrapper:not(.has-target-within) {
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
  pointer-events: none;
  background-color: $text_0;
  opacity: 0.95;
  color: $background_0;

  &.has-text-center {
    text-align: center;
  }

  &.manual {
    max-width: unset;
  }

  &.is-dark-theme {
    background-color: $general_1;

    .card {
      background-color: $general_1;
    }
  }

  &.in-reduced-motion {
    * {
      animation-duration: 0ms !important;
      transition: none !important;
    }
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
