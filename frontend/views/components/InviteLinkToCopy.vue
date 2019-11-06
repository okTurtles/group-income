<template lang='pug'>
component.c-wrapper(
  :is='tag'
  @click='copyToClipboard'
  data-test='invitationLink'
)
  input.c-invisible-input(
    type='text'
    ref='input'
    :value='inviteLink'
  )
  span.link.has-ellipsis.c-link {{ inviteLink }}
  button.is-icon-small.has-background.c-copy-button(:aria-label='L("Copy link")')
    i.icon-copy.is-regular
  transition(name='fade')
    i18n.c-tooltip(
      v-if='ephemeral.isTooltipActive'
      :style='ephemeral.tooltipPosition'
      key='test'
      tag='p'
      v-append-to-body=''
    ) Copied to clipboard!
</template>

<script>
export default {
  name: 'InviteLinkToCopy',
  data: () => ({
    ephemeral: {
      isTooltipActive: false,
      tooltip: null,
      tooltipPosition: null
    }
  }),
  props: {
    inviteLink: {
      type: String,
      required: true
    },
    tag: {
      type: String,
      default: 'div'
    }
  },
  methods: {
    copyToClipboard () {
      // if the user is using the device that supports web share API, use it and then skip the other logics below.
      if (navigator.share) {
        navigator.share({
          title: this.L('Your invite'),
          url: this.textToCopy
        })
        return
      }

      this.$refs.input.select()
      document.execCommand('copy')
      this.ephemeral.isTooltipActive = true
      setTimeout(() => {
        this.ephemeral.isTooltipActive = false
      }, 1500)
    },
    adjustPosition () {
      this.trigger = this.$el.getBoundingClientRect()
      const { scrollX, scrollY } = window
      const { width, left, top } = this.trigger
      const spacing = 16
      const x = scrollX + left + width / 2 - this.ephemeral.tooltip.width / 2
      const y = scrollY + top - (this.ephemeral.tooltip.height + spacing)

      this.ephemeral.tooltipPosition = `transform: translate(${x}px, ${y}px)`
    }
  },
  directives: {
    appendToBody: {
      // refer to the comment in Tooltip.vue for the further information on this custom directive.
      inserted (el, bindings, vnode) {
        document.body.appendChild(el)

        const $this = vnode.context // Vue component instance

        if (!$this.ephemeral.tooltip) {
          $this.ephemeral.tooltip = el.getBoundingClientRect()
        }

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

<style lang='scss' scoped>
@import '../../assets/style/_variables.scss';

.c-wrapper {
  position: relative;

  .c-invisible-input {
    position: absolute;
    pointer-events: none;
    opacity: 0;
    z-index: -100;
  }
}

.c-tooltip {
  position: absolute;
  top: 0;
  left: 0%;
  min-width: 3rem;
  width: max-content;
  border-radius: $radius;
  padding: $spacer-sm;
  z-index: $zindex-tooltip;
  pointer-events: none;
  background-color: $text_0;
  color: #fff;
  transform: translate(-50%, calc(-100% - #{$size-3}));

  &:not(.fade-enter-active):not(.fade-leave-active) {
    opacity: 0.95;
  }
}

.c-copy-button {
  margin-left: $spacer-xs;
}
</style>
