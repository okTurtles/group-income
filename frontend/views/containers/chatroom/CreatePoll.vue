<template lang="pug">
.c-create-poll(:class='{ "is-active": ephemeral.isActive }' @click='onBackDropClick')
  .c-create-poll-wrapper
</template>

<script>
import sbp from '@sbp/sbp'
import { OPEN_POLL, CLOSE_POLL } from '@utils/events.js'

export default {
  name: 'CreatePoll',
  data () {
    return {
      ephemeral: {
        isActive: false
      }
    }
  },
  methods: {
    open () {
      this.ephemeral.isActive = true
    },
    close () {
      this.ephemeral.isActive = false
    },
    onBackDropClick (e) {
      const element = document.elementFromPoint(e.clientX, e.clientY).closest('.c-create-poll-wrapper')

      if (!element) {
        this.close()
      }
    }
  },
  created () {
    sbp('okTurtles.events/on', OPEN_POLL, this.open)
    sbp('okTurtles.events/on', CLOSE_POLL, this.close)
  },
  beforeDestroy () {
    sbp('okTurtles.events/off', OPEN_POLL, this.open)
    sbp('okTurtles.events/off', CLOSE_POLL, this.close)
  }
}
</script>

<style lang="scss" scoped>
@import "@assets/style/_variables.scss";

.c-create-poll {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 0;
  pointer-events: none;
  overflow: hidden;
  z-index: $zindex-tooltip;
  background-color: rgba(0, 0, 0, 0.45);

  &.is-active {
    pointer-events: initial;
    height: 100%;
  }
}

.c-create-poll-wrapper {
  position: absolute;
  pointer-events: inherit;
  background-color: $background_0;
}
</style>
