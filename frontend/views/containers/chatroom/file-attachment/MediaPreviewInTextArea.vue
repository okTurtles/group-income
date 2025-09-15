<template lang='pug'>
.c-media-preview-card(
  :class='"is-" + fileType'
  v-on='$listeners'
)
  img.c-preview-img(
    v-if='fileType === "image"'
    :src='attachment.url'
    :alt='attachment.name'
  )
  .c-preview-video(v-else-if='fileType === "video"')
    .c-video-thumb-container
    .c-video-play-icon
      i.icon-play

  button.c-attachment-remove-btn(
    type='button'
    :aria-label='L("Remove attachment")'
    @click.stop='$emit("remove")'
  )
    i.icon-times
</template>

<script>
import { getFileType } from '@view-utils/filters.js'

export default {
  name: 'MediaPreviewInTextArea',
  props: {
    attachment: {
      type: Object,
      required: true
    }
  },
  computed: {
    fileType () {
      return getFileType(this.attachment.mimeType)
    }
  }
}
</script>

<style lang='scss' scoped>
@import "@assets/style/_variables.scss";

.c-media-preview-card {
  position: relative;
  display: inline-block;
  border: 1px solid $general_0;
  border-radius: 0.25rem;
  width: 4.5rem;
  height: 4.5rem;
  cursor: pointer;

  &.is-image {
    .c-preview-img {
      pointer-events: none;
      position: relative;
      width: 100%;
      height: 100%;
      border-radius: inherit;
      background-color: $general_2;
      object-fit: cover;
    }
  }

  &.is-video {
    .c-video-thumb-container {
      position: relative;
      width: 100%;
      height: 100%;
      background-color: $general_0;
      overflow: hidden;
      border-radius: inherit;
    }

    .c-video-play-icon {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      width: 1.5rem;
      height: 1.5rem;
      font-size: 0.625rem;
      line-height: 1;
      border-radius: 50%;
      color: $white;
      background-color: $primary_0;
      z-index: 1;
      display: inline-flex;
      align-items: center;
      justify-content: center;

      i {
        transform: translateX(1px);
      }
    }
  }
}

button.c-attachment-remove-btn {
  @extend %reset-button;
  position: absolute;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  top: 0;
  right: 0;
  transform: translate(50%, -50%);
  z-index: 2;
  width: 1.125rem;
  height: 1.125rem;
  border-radius: 1rem;
  font-weight: 600;
  font-size: 0.75rem;
  background-color: $text_1;
  color: $general_1;
}
</style>
