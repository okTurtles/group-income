<template lang='pug'>
.c-dnd-active-overlay
  .c-content-container
    svg-attachment.c-attachment-img
    i18n.is-title-3(tag='h4') Upload attachment

  input.c-dnd-input-helper(
    type='file'
    @dragleave='emitDragEnded'
    @dragend='emitDragEnded'
    @drop='emitDragEnded'
  )
</template>

<script>
import SvgAttachment from '@svgs/attachment.svg'

export default {
  name: 'DragActiveOverlay',
  components: {
    SvgAttachment
  },
  methods: {
    emitDragEnded (e) {
      e.preventDefault()
      e.stopPropagation()

      this.$emit('drag-ended', e)
    }
  }
}
</script>

<style lang="scss" scoped>
@import "@assets/style/_variables.scss";

@mixin absoluteFullScreen {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
}

.c-dnd-active-overlay {
  @include absoluteFullScreen;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2;

  &::before {
    @include absoluteFullScreen;
    content: "";
    display: block;
    z-index: 0;
    background-color: $background_0;
    opacity: 0.85;
  }

  .c-content-container {
    position: relative;
    display: flex;
    flex-direction: column;
    align-items: center;
    z-index: 1;
    pointer-events: none;
    opacity: 0;
    transform-origin: center;
    animation: attachment-intro 150ms ease-out forwards;
  }

  .c-attachment-img {
    display: block;
    margin-bottom: 1rem;
    fill: $primary_0;
    width: 7.25rem;
    height: auto;

    @include until($tablet) {
      width: 5.75rem;
    }
  }

  .c-dnd-input-helper {
    @include absoluteFullScreen;
    display: block;
    opacity: 0;
    z-index: 2;
  }
}

@keyframes attachment-intro {
  0% {
    opacity: 0;
    transform: scale(0.5);
  }

  100% {
    opacity: 1;
    transform: scale(1);
  }
}
</style>
