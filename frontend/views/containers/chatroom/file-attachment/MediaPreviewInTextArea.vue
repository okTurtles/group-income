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
      .c-loader(v-if='ephemeral.video.isGeneratingThumbnail')
      template(v-else)
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
        })
      }
      const cleanup = () => {
        videoEl.removeEventListener('loadedmetadata', onLoadMetadata)
        videoEl.removeEventListener('error', onError)
        videoEl.src = ''
      }
      const onLoadMetadata = async () => {
        try {
          // Timestamp to seek here is 1 second or less so the data loads fast.
          const targetTime = Math.min(1, videoEl.duration / 2)
          const isSuccess = await seekToTime(targetTime)
          if (isSuccess) {
            this.ephemeral.video.thumbnailURL = await this.generateImageURLByCanvas(
              videoEl, videoEl.videoWidth, videoEl.videoHeight
            )
          }
        } catch (error) {
          // in case of thumbnail generation error, just silently ignore and use the default background css style.
          console.error('MediaPreviewInTextArea.vue caught:', error)
        } finally {
          cleanup()
          this.ephemeral.video.isGeneratingThumbnail = false
        }
      }
      const onError = () => {
        cleanup()
        this.ephemeral.video.isGeneratingThumbnail = false
      }

      videoEl.preload = 'metadata'
      // NOTE: Some browsers have autoplay restrictions where a video with audio cannot autoplay without user interaction.
      //       Muting the video here is to prevent this issue.
      videoEl.muted = true
      videoEl.addEventListener('loadedmetadata', onLoadMetadata)
      videoEl.addEventListener('error', onError)
      videoEl.src = this.attachment.url
    },
    async generateImageURLByCanvas (video, width, height) {
      const canvasEl = document.createElement('canvas')
      const ctx = canvasEl.getContext('2d')
      const toBlob = () => new Promise((resolve, reject) => {
        canvasEl.toBlob(blob => {
          if (blob) {
            resolve(blob)
          } else {
            reject(new Error('Failed to generate thumbnail image URL by canvas'))
          }
        }, 'image/png', 0.85) // Thumbnail quality does not need to be super crisp.
      })
      canvasEl.width = width
      canvasEl.height = height
      ctx.drawImage(video, 0, 0, canvasEl.width, canvasEl.height)
      const blob = await toBlob()
      return URL.createObjectURL(blob)
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
  flex-shrink: 0;

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
      background-color: $general_1;
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

.c-loader {
  display: block;
  position: absolute;
  top: 50%;
  left: 50%;
  width: 1rem;
  height: 1rem;
  border: 2px solid;
  border-top-color: transparent;
  border-radius: 50%;
  color: $primary_0;
  z-index: 1;
  animation: loadSpin 1.75s infinite linear;
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
