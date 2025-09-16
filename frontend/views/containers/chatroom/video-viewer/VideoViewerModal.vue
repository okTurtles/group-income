<template lang="pug">
.c-video-viewer-modal
  .c-video-viewer-content
    header.c-modal-header
      button.is-icon-small.c-close-btn(
        type='button'
        @click.stop='close'
      )
        i.icon-times
    p TODO!
</template>

<script>
import sbp from '@sbp/sbp'
import { CLOSE_MODAL } from '@utils/events.js'
import trapFocus from '@utils/trapFocus.js'

export default {
  name: 'VideoViewerModal',
  mixins: [trapFocus],
  methods: {
    close () {
      sbp('okTurtles.events/emit', CLOSE_MODAL, 'VideoViewerModal')
    }
  }
}
</script>

<style lang="scss" scoped>
@import "@assets/style/_variables.scss";

.c-video-viewer-modal {
  @include media-viewer-modal-container($zindex:$zindex-modal);
}

.c-video-viewer-content {
  @include media-viewer-modal-content;
  background-color: $general_0;
}

.c-modal-header {
  position: relative;
  width: 100%;
  min-height: 1.75rem;
}

button.c-close-btn {
  position: absolute;
  right: 0.75rem;
  top: 1rem;
  background-color: $general_1;
  color: $text_0;
}
</style>
