<template lang='pug'>
span.c-twrapper(
  :class='{ "has-target-within": triggerElementSelector, "anchored-to-element": anchorToElement }'
  v-bind='rootElAttrs'
)
  slot

  template(v-if='revealTooltip')
    .c-anchored-tooltip(
      v-if='anchorToElement'
      :class='tooltipClasses'
      :style='styles'
      v-anchor-to-trigger=''
    )
      // Default tooltip is text
      template(v-if='text') {{text}}
      // But any content can fit in
      slot(v-else='' name='tooltip')

    template(v-else)
      transition(name='fade')
        .c-background(
          v-if='manual'
          @click='toggle'
          v-append-to-body=''
          data-test='closeProfileCard'
        )

      .c-tooltip(
        :style='styles'
        :class='tooltipClasses'
        v-append-to-body='{ manual }'
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
    },
    anchorToElement: {
      // An option to opt out of the v-append-to-body vue-directive. Instead of appending the tooltip to document.body,
      // It will be anchored to the trigger DOM element so it won't detached from the original position while scrolling the page etc..
      // (reference: https://github.com/okTurtles/group-income/issues/2450)
      type: Boolean,
      default: false
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
      'isReducedMotionMode',
      'isDarkTheme'
    ]),
    rootElAttrs () {
      return {
        'tabindex': !this.triggerElementSelector
          ? (this.manual ? '-1' : '0')
          : null,
        'aria-label': !this.triggerElementSelector ? this.text : undefined
      }
    },
    revealTooltip () {
      return this.isActive || this.isVisible
    },
    tooltipClasses () {
      return {
        'has-text-center': this.isTextCenter,
        'is-active': this.isActive,
        'is-dark-theme': this.isDarkTheme,
        'in-reduced-motion': this.isReducedMotionMode,
        manual: this.manual
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
    isIOSSafari () {
      const ua = window.navigator.userAgent
      return /iP(hone|od|ad)/.test(ua) && /Safari/.test(ua)
    },
    hideTooltipOnTouchOutside (e) {
      // NOTE: This is a fix for the iOS-Safari-only issue https://github.com/okTurtles/group-income/issues/2492
      //       where the tooltip does not close when the user touches outside the tooltip.
      //       The issue happens because 'blur' event in iOS-Safari does not fire and as a workaround,
      //       we listen for 'touchstart' event attached to the document.body and manually check if user touches outside the tooltip wrapper.
      if (this.isActive && !this.triggerDOM.contains(e.target)) {
        this.hide()
      }
    },
    adjustPosition () {
      this.trigger = (this.triggerDOM || this.$el).getBoundingClientRect()

      const { scrollX, scrollY } = window
      const { width, height, left, top } = this.trigger
      const windowHeight = window.innerHeight
      const spacing = 16
      let transform
      let absPosition // For css top/left/bottom/right properties to use along with 'position: absolute'

      if (this.manual && window.innerWidth < TABLET) {
        // On mobile, position tooltip at the bottom of the screen with the side-padding removed.
        transform = `translate(-8px, ${windowHeight - this.tooltipHeight}px)`
      } else if (this.anchorToElement) {
        let x, y // for css transform: translate(...)

        switch (this.direction) {
          case 'right':
            x = `${spacing}px`
            y = '-50%'
            absPosition = { top: '50%', left: '100%' }
            break
          case 'left':
            x = '-100%'
            y = '-50%'
            absPosition = { top: '50%', left: `-${spacing}px` }
            break
          case 'bottom-left':
            x = 0
            y = `${spacing}px`
            absPosition = { top: '100%' }
            break
          case 'bottom-right':
            x = '-100%'
            y = '100%'
            absPosition = { bottom: `-${spacing}px`, left: '100%' }
            break
          case 'top':
            x = '-50%'
            y = '-100%'
            absPosition = { top: `-${spacing}px`, left: '50%' }
            break
          case 'top-left':
            x = 0
            y = '-100%'
            absPosition = { top: `-${spacing}px`, left: 0 }
            break
          default: // defaults to 'bottom'
            x = '-50%'
            y = '100%'
            absPosition = { left: '50%', bottom: `-${spacing}px` }
        }

        transform = `translate(${x}, ${y})`
      } else {
        let x
        let y = scrollY + top + height / 2 - this.tooltipHeight / 2 // y position defaults to the trigger's center.

        // If y position is off-screen, move it to the edges with some spacing.
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

        transform = `translate(${x}px, ${y}px)`
      }

      this.styles = {
        transform,
        ...(absPosition || {}),
        pointerEvents: this.manual ? 'initial' : 'none',
        backgroundColor: this.manual ? 'transparent' : undefined,
        opacity: this.opacity
      }
    }
  },
  directives: {
    // The tooltip instead of being rendered on the original DOM position
    // it's appended to the 'div.l-page' page element, away from every other elements
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
    },
    anchorToTrigger: {
      inserted (el, bindings, vnode) {
        const $this = vnode.context
        if ($this.triggerElementSelector) {
          // Append the tooltip to a particular element (which is specified by a selector)
          $this.triggerDOM.appendChild(el)
        }

        $this.adjustPosition()
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
      this.triggerDOM.style.position = 'relative'

      if (this.isIOSSafari()) {
        // This is a fix for the iOS-Safari-only issue https://github.com/okTurtles/group-income/issues/2492
        // Check hideTooltipOnTouchOutside() method for more details.
        document.body.addEventListener('touchstart', this.hideTooltipOnTouchOutside)
      }
    }
  },
  beforeDestroy () {
    this.triggerDOM.removeEventListener('click', this.toggle)
    this.triggerDOM.removeEventListener('mouseenter', this.show)
    this.triggerDOM.removeEventListener('mouseleave', this.hide)
    this.triggerDOM.removeEventListener('focus', this.show)
    this.triggerDOM.removeEventListener('blur', this.hide)

    if (this.triggerElementSelector && this.isIOSSafari()) {
      document.body.removeEventListener('touchstart', this.hideTooltipOnTouchOutside)
    }
  }
}: Object)
</script>

<style lang="scss" scoped>
@import "@assets/style/_variables.scss";

.c-twrapper {
  &.anchored-to-element {
    position: relative;
  }

  &:not(.has-target-within) {
    cursor: pointer;
  }
}

.c-tooltip,
.c-anchored-tooltip {
  @include tooltip-style-common;

  &.has-text-center {
    text-align: center;
  }

  &.manual {
    max-width: unset;
  }

  &.is-dark-theme .card {
    background-color: $general_1;
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

.c-anchored-tooltip {
  width: max-content;
  height: max-content;
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
