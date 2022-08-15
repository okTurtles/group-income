<template lang='pug'>
component.c-wrapper(
  :is='tag'
  @click='copyToClipboard'
  data-test='invitationLink'
)
  input.c-invisible-input(
    type='text'
    ref='input'
    :value='link'
  )
  a.link.has-ellipsis.c-link(
    aria-hidden='true'
    @click.prevent=''
  ) {{ link }}
  button.is-icon-small.has-background.c-copy-button(:aria-label='L("Copy link")')
    i.icon-copy.is-regular
  tooltip.c-feedback(
    v-if='ephemeral.isTooltipActive'
    :isVisible='true'
    direction='top'
    :text='L("Copied to clipboard!")'
  )
</template>

<script>
import Tooltip from '@components/Tooltip.vue'

export default ({
  name: 'LinkToCopy',
  components: {
    Tooltip
  },
  data: () => ({
    ephemeral: {
      isTooltipActive: false
    }
  }),
  props: {
    link: {
      type: String,
      required: true
    },
    tag: {
      type: String,
      default: 'div'
    }
  },
  methods: {
    // FIXME: probably needs to be defined centrally somewhere else
    isMacSafari () {
      // NB: Chrome, Edge, Brave on Macintosh tacks on the 'Safari/537.36' string in its userAgent
      // so we have to ensure that were not mistaking those browsers instead when matching for Safari on Macintosh
      const userAgent = navigator.userAgent
      const safari = /Macintosh.*Safari/
      const chrome = /Macintosh.*Chrome/
      const edge = /Macintosh.*Edg/
      return userAgent.match(safari) &&
              !(userAgent.match(chrome) || userAgent.match(edge))
    },
    copyToClipboard () {
      // if the user is using the device that supports web share API, use it and then skip the other logics below.
      if (navigator.share && !this.isMacSafari()) {
        navigator.share({
          title: this.L('Your invite'),
          url: this.link
        }).catch((error) => console.error('navigator.share failed with:', error))
        return
      }

      const displayTooltip = () => {
        this.ephemeral.isTooltipActive = true

        setTimeout(() => {
          this.ephemeral.isTooltipActive = false
        }, 1500)
      }

      this.$refs.input.select()
      if (navigator.clipboard) {
        navigator.clipboard.writeText(this.link).then(displayTooltip)
      } else {
        // document.execCommand is deprecated, so only use it as a fallback of Clipboard API.
        // reference: https://developer.mozilla.org/en-US/docs/Web/API/Document/execCommand
        document.execCommand('copy')

        displayTooltip()
      }
    }
  }
}: Object)
</script>

<style lang='scss' scoped>
@import "@assets/style/_variables.scss";

.c-wrapper {
  position: relative;
  display: flex;
  align-items: center;
  min-width: 0; // So ellipsis works correctly inside grid. pls refer to a discussion here(https://github.com/okTurtles/group-income/pull/765#issuecomment-551691920) for the context.
  .c-invisible-input {
    position: absolute;
    pointer-events: none;
    opacity: 0;
  }
}

.c-feedback {
  position: absolute;
  left: 50%;
  transform: translateX(-50%);
}

.c-copy-button {
  margin-left: 0.25rem;
  flex-shrink: 0;
  font-weight: normal;
}
</style>
