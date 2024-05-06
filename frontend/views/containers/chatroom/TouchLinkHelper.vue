<template lang='pug'>
.c-touch-link-helper(:class='{ "is-active": ephemeral.isActive }')
  .c-overlay-background

  .c-panel-content(tabindex='0' ref='contentEl')
    .c-panel-header
      i.icon-link.c-header-icon
      .c-link-content.has-text-1 {{ ephemeral.linkUrl }}
      button.is-icon.has-background.c-close-btn(@click='close')
        i.icon-times
</template>

<script>
import sbp from '@sbp/sbp'
import { OPEN_TOUCH_LINK_HELPER } from '@utils/events.js'

export default ({
  name: 'TouchLinkHelper',
  data () {
    return {
      ephemeral: {
        isActive: false,
        linkUrl: ''
      }
    }
  },
  methods: {
    close () {
      if (this.ephemeral.isActive) {
        this.ephemeral.isActive = false
      }
    },
    open (linkUrl = '') {
      if (linkUrl) {
        this.ephemeral.linkUrl = linkUrl
        this.ephemeral.isActive = true

        this.$refs.contentEl.focus()
      }
    }
  },
  beforeMount () {
    sbp('okTurtles.events/on', OPEN_TOUCH_LINK_HELPER, this.open)
  },
  beforeDestroy () {
    sbp('okTurtles.events/off', OPEN_TOUCH_LINK_HELPER, this.open)
  }
}: Object)
</script>

<style lang="scss" scoped>
@import "@assets/style/_variables.scss";

.c-touch-link-helper {
  position: fixed;
  top: 0;
  z-index: $zindex-tooltip;
  left: 0;
  width: 100%;
  height: 0;
  pointer-events: none;
  overflow: hidden;

  &.is-active {
    pointer-events: initial;
    height: 100%;
  }
}

.c-overlay-background {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.7);
  z-index: 0;
  opacity: 0;
  transition: opacity 300ms linear;

  .is-active & {
    opacity: 1;
  }
}

.c-panel-content {
  position: absolute;
  bottom: 0;
  left: 0;
  width: 100%;
  height: max-content;
  border-radius: 1rem 1rem 0 0;
  background-color: $general_2;
  overflow: hidden;
  z-index: 1;
}

.c-panel-header {
  position: relative;
  padding: 1rem 1.2rem;
  display: flex;
  align-items: center;
  background-color: $general_1;
  gap: 0.75rem;

  .c-header-icon {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 2rem;
    height: 2rem;
    border-radius: 50%;
    background-color: $text_1;
    color: $general_2;
    flex-shrink: 0;
    font-size: $size_4;
  }

  .c-link-content {
    flex-grow: 1;
  }

  .c-close-btn {
    width: 2rem;
    height: 2rem;
  }
}
</style>
