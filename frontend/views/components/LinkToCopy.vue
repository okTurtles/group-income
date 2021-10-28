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
