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
  template(v-else-if='fileType === "video"')
    .c-video-thumb-container
      img.c-video-thumb-img(
        v-if='ephemeral.video.thumbnailURL'
        :src='ephemeral.video.thumbnailURL'
      )
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
  data () {
    return {
      ephemeral: {
        video: {
          isGeneratingThumbnail: false,
          thumbnailURL: null
        }
      }
    }
  },
  computed: {
    fileType () {
      return getFileType(this.attachment.mimeType)
    },
    isVideo () {
      return this.fileType === 'video'
    }
  },
  methods: {
    generateVideoThumbnail () {
      // TODO-1: Check if this works well in iOS Safari.
      // TODO-2: Display a loading indicator while generating the thumbnail.
      if (!this.isVideo || !this.attachment.url) { return }

      this.ephemeral.video.isGeneratingThumbnail = true
      this.ephemeral.video.thumbnailURL = null

      const videoEl = document.createElement('video')
      const seekToTime = (timeStamp) => {
        return new Promise(resolve => {
          videoEl.currentTime = timeStamp
          const onSeekSuccess = () => {
            videoEl.removeEventListener('seeked', onSeekSuccess)
            resolve(true)
          }

          videoEl.addEventListener('seeked', onSeekSuccess)
          videoEl.addEventListener('error', () => resolve(false))
        })
      }

      videoEl.preload = 'metadata'
      // NOTE: Some browsers have autoplay restrictions where a video with audio cannot autoplay without user interaction.
      //       Muting the video here is to prevent this issue.
      videoEl.muted = true
      videoEl.src = this.attachment.url
      videoEl.addEventListener('loadedmetadata', async () => {
        // Timestamp to seek here is 1 second or less so the data loads fast.
        const targetTime = Math.min(1, videoEl.duration / 2)
        const isSuccess = await seekToTime(targetTime)
        if (isSuccess) {
          const canvasEl = document.createElement('canvas')
          const ctx = canvasEl.getContext('2d')
          canvasEl.width = videoEl.videoWidth
          canvasEl.height = videoEl.videoHeight
          ctx.drawImage(videoEl, 0, 0, canvasEl.width, canvasEl.height)
          this.ephemeral.video.thumbnailURL = canvasEl.toDataURL('image/png')
          this.ephemeral.video.isGeneratingThumbnail = false
        }
      })
    },
    clearVideoThumbnail () {
      if (this.ephemeral.video.thumbnailURL) {
        URL.revokeObjectURL(this.ephemeral.video.thumbnailURL)
      }
    }
  },
  created () {
    if (this.isVideo) {
      this.generateVideoThumbnail()
    }
  },
  beforeDestroy () {
    if (this.isVideo) {
      this.clearVideoThumbnail()
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

      .c-video-thumb-img {
        display: block;
        width: 100%;
        height: 100%;
        object-fit: cover;
      }
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
