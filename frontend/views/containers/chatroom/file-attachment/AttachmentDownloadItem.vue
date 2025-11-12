<template lang='pug'>
.c-attachment-download-item(:class='{ "is-video": isVideo }')
  .c-non-media-card(v-if='!isMediaType')
    .c-non-media-icon
      i.icon-file
    .c-non-media-file-info
      .c-file-name.has-ellipsis(:title='attachment.name') {{ attachment.name }}
      .c-file-ext-and-size
        .c-file-ext {{ fileExt }}
        .c-file-size(v-if='fileSizeDisplay') {{ fileSizeDisplay }}

  // TODO: Implement audio-player component and use it here instead of below placeholder.
  .c-audio-card(v-if='isAudio')
    audio-player.c-audio-player(
      v-if='isAudioPlayable'
      :src='mediaObjectURL'
      :mimeType='attachment.mimeType'
    )

  .c-image-card(v-else-if='isImage')
    img(
      v-if='mediaObjectURL'
      :src='mediaObjectURL'
      :alt='attachment.name'
      @click='attachmentUtils.openImageViewer(mediaObjectURL)'
      @load='attachmentUtils.onImageSrcSettled(mediaObjectURL)'
      @error='attachmentUtils.onImageSrcSettled(mediaObjectURL)'
    )
    .loading-box(v-else :style='ephemeral.imgLoadingBoxStyles')

  .c-video-card(v-else-if='isVideo')
    video-player.c-video-player(
      ref='videoPlayer'
      v-if='isVideoPlayable'
      :src='mediaObjectURL'
      :mimeType='attachment.mimeType'
      mode='simple'
    )
    template(v-else)
      .c-video-details
        i.icon-video.c-video-icon(v-if='isVideoStatus("idle")')
        i.icon-exclamation-triangle.c-video-icon.is-error(v-else-if='isVideoStatus("error")')
        .c-video-icon(v-else-if='isVideoStatus("loading")')
          .c-spinner

        .c-details-text
          .c-filename.has-ellipsis(:title='attachment.name') {{ attachment.name }}
          .c-filesize {{ fileSizeDisplay }}

        button.is-small.is-outlined.c-load-video-button(
          :class='{ "is-loading": isVideoStatus("loading"), "is-danger": isVideoStatus("error") }'
          type='button'
          @click.stop='loadVideo'
        ) {{ getLoadBtnText(ephemeral.videoLoadingStatus) }}

  .c-pending-flag(v-if='isPending')
  .c-failed-flag(v-else-if='isFailed')
    i.icon-exclamation-triangle

  .c-attachment-actions-wrapper(
    :class='{ "is-for-media": isMediaType }'
  )
    .c-attachment-actions
      tooltip(
        direction='top'
        :text='getDownloadTooltipText(attachment)'
      )
        button.is-icon-small(
          :aria-label='L("Download")'
          @click.stop='$emit("download")'
        )
          i.icon-download

      tooltip(
        v-if='canDelete'
        direction='top'
        :text='L("Delete")'
      )
        button.is-icon-small(
          :aria-label='L("Delete")'
          @click='$emit("delete")'
        )
          i.icon-trash-alt

      tooltip(
        v-if='isVideoPlayable'
        direction='top'
        :text='L("Expand")'
      )
        button.is-icon-small(
          :aria-label='L("Expand")'
          @click.stop='openVideoModal'
        )
          i.icon-expand
</template>

<script>
import { getFileExtension, getFileType, formatBytesDecimal } from '@view-utils/filters.js'
import { MESSAGE_VARIANTS, CHATROOM_ATTACHMENT_TYPES } from '@model/contracts/shared/constants.js'
import { L } from '@common/common.js'
import VideoPlayer from '../video-viewer/VideoPlayer.vue'
import AudioPlayer from '../audio-player/AudioPlayer.vue'
import Tooltip from '@components/Tooltip.vue'

export default {
  name: 'AttachmentDownloadItem',
  components: {
    Tooltip,
    AudioPlayer,
    VideoPlayer
  },
  inject: ['attachmentUtils'],
  props: {
    attachment: {
      type: Object,
      required: true
    },
    variant: {
      type: String,
      required: false
    },
    mediaObjectURL: {
      type: String,
      required: false
    },
    canDelete: {
      type: Boolean,
      required: false
    }
  },
  data () {
    return {
      ephemeral: {
        imgLoadingBoxStyles: {},
        videoLoadingStatus: 'idle' // 'idle', 'loading', 'error'
      }
    }
  },
  computed: {
    fileType () {
      return getFileType(this.attachment.mimeType)
    },
    isImage () {
      return this.fileType === CHATROOM_ATTACHMENT_TYPES.IMAGE
    },
    isVideo () {
      return this.fileType === CHATROOM_ATTACHMENT_TYPES.VIDEO
    },
    isAudio () {
      return this.fileType === CHATROOM_ATTACHMENT_TYPES.AUDIO
    },
    isVideoPlayable () {
      return this.isVideo && this.mediaObjectURL
    },
    isAudioPlayable () {
      return this.isAudio && this.mediaObjectURL
    },
    isMediaType () {
      return this.isImage || this.isVideo || this.isAudio
    },
    fileExt () {
      return getFileExtension(this.attachment.name, true)
    },
    fileSizeDisplay () {
      return this.attachment.size ? formatBytesDecimal(this.attachment.size) : ''
    },
    isPending () {
      return this.variant === MESSAGE_VARIANTS.PENDING
    },
    isFailed () {
      return this.variant === MESSAGE_VARIANTS.FAILED
    }
  },
  methods: {
    isVideoStatus (status) {
      return this.ephemeral.videoLoadingStatus === status
    },
    getDownloadTooltipText ({ size }) {
      return this.isImage
        ? `${L('Download ({size})', { size: formatBytesDecimal(size) })}`
        : L('Download')
    },
    getVideoCurrentTime () {
      return this.isVideo
        ? this.$refs.videoPlayer.getCurrentTime()
        : null
    },
    openVideoModal () {
      if (this.isVideo) {
        this.$refs.videoPlayer.pause()

        this.attachmentUtils.openVideoViewer(this.mediaObjectURL, {
          initialTime: this.getVideoCurrentTime()
        })
      }
    },
    getLoadBtnText (status) {
      return ({
        loading: L('Loading...'),
        error: L('Retry'),
        idle: L('Load video')
      })[status]
    },
    async loadVideo () {
      try {
        this.ephemeral.videoLoadingStatus = 'loading'
        await this.attachmentUtils.loadVideoObjectURL(this.attachment)
        this.ephemeral.videoLoadingStatus = 'idle'
      } catch (err) {
        console.error('AttachmentDownloadItem.vue caught:', err)
        this.ephemeral.videoLoadingStatus = 'error'
      }
    }
  },
  mounted () {
    if (this.isImage) {
      this.ephemeral.imgLoadingBoxStyles = this.attachmentUtils.getStretchedDimension(this.attachment.dimension)
    }
  }
}
</script>

<style lang='scss' scoped>
@import "@assets/style/_variables.scss";

$mobile-narrow: 441px;

.c-attachment-download-item {
  position: relative;
  display: inline-block;
  border: 1px solid $general_0;
  border-radius: 0.25rem;

  &:hover,
  &:focus {
    border-color: $text_1;

    .c-attachment-actions-wrapper {
      display: block;
    }
  }

  &:active,
  &:focus {
    border-color: $text_0;
  }

  &.is-video {
    display: block;
    max-width: 28.25rem;
  }
}

.c-non-media-card {
  position: relative;
  height: 100%;
  display: grid;
  grid-template-columns: auto 1fr;
  grid-template-rows: 1fr;
  grid-template-areas: "preview-icon preview-info";
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem;
  border-radius: inherit;
  background-color: $general_2;
  width: 14rem;
  max-width: 14rem;
  min-height: 3.5rem;

  @include from (430px) {
    width: 16rem;
    max-width: 16rem;
  }

  .c-non-media-icon {
    grid-area: preview-icon;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border-radius: inherit;
    width: 2.5rem;
    height: 2.5rem;
    font-size: 1.25rem;
    color: $primary_0;
    background-color: $primary_2;
  }

  .c-non-media-file-info {
    grid-area: preview-info;
    position: relative;
    display: block;
    line-height: 1.2;
    min-width: 0;
    width: 100%;

    .c-file-name {
      position: relative;
      font-weight: bold;
      max-width: 13.25rem;
    }

    .c-file-ext-and-size {
      display: flex;
      align-items: flex-end;
      flex-direction: row;
      column-gap: 0.325rem;
    }

    .c-file-size {
      color: $text_1;
      font-size: 0.8em;
    }
  }
}

.c-image-card {
  position: relative;
  width: 100%;
  height: 100%;
  border-radius: inherit;
  background-color: $general_2;
  object-fit: cover;
  padding: 0.5rem;

  img {
    user-select: none;
    cursor: pointer;
    max-width: 100%;
    max-height: 20rem;

    @include phone {
      max-height: 12rem;
    }
  }

  .loading-box {
    border-radius: 0;
    margin-bottom: 0;
    max-height: 20rem;
    min-height: unset;
    max-width: 100%;
  }
}

.c-pending-flag {
  position: absolute;
  top: 0.75rem;
  right: 0.75rem;

  &::after {
    content: "";
    position: absolute;
    width: 1rem;
    height: 1rem;
    border: 2px solid;
    border-top-color: transparent;
    border-radius: 50%;
    color: $general_0;
    animation: loadSpin 1.75s infinite linear;
  }
}

.c-failed-flag {
  position: absolute;
  top: 0.25rem;
  right: 0.25rem;
  color: $warning_0;
}

.c-attachment-actions-wrapper {
  display: none;
  position: absolute;
  right: 0.5rem;
  top: 0;

  .c-attachment-actions {
    display: flex;
    gap: 0.25rem;
    align-self: center;
    align-items: center;
    background-color: $background_0;
    padding: 2px;

    .is-icon-small {
      border-radius: 0;
    }
  }

  &.is-for-media {
    .c-attachment-actions {
      margin-top: 0.5rem;
    }
  }
}

.c-invisible-link {
  position: absolute;
  top: -10rem;
  left: -10rem;
  opacity: 0;
  pointer-events: none;
}

.c-video-card {
  position: relative;
  border-radius: inherit;
  max-width: 28.25rem;
  width: 100%;
  background-color: $general_2;
  padding: 0.5rem;

  @include from($desktop) {
    max-width: 30.25rem;
  }

  .c-video-details,
  .c-video-error {
    position: relative;
    width: 100%;
    aspect-ratio: 16/9;
    border-radius: 0;
    margin-bottom: 0;
  }

  .c-video-details {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    row-gap: 0.25rem;
    border-radius: inherit;
    border: 1px solid $general_0;
    background-color: $general_1;
    min-width: 0;

    @include from($mobile-narrow) {
      row-gap: 0.75rem;
    }

    .c-video-icon {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      font-size: 0.725rem;
      line-height: 1;
      height: 1.75rem;
      width: 1.75rem;
      border-radius: 50%;
      border: 1px solid $general_0;
      background-color: $general_2;

      &.is-error {
        background-color: $danger_0;
        color: $danger_2;
      }

      @include from($mobile-narrow) {
        height: 2.75rem;
        width: 2.75rem;
        font-size: 1.125rem;
      }
    }

    .c-details-text {
      position: relative;
      min-width: 0;
      width: 100%;
      text-align: center;
      padding: 0 0.75rem;
      font-size: $size_5;
      line-height: 1.275;

      .c-filesize {
        color: $text_1;
        font-size: 0.85em;
      }

      @include from($mobile-narrow) {
        font-size: $size_4;
        line-height: 1.4;
      }
    }

    button.c-load-video-button {
      &.is-loading {
        pointer-events: none;
        cursor: not-allowed;

        &:focus {
          box-shadow: none;
        }
      }

      @include until($mobile-narrow) {
        min-height: 1.4rem;
        font-size: $size_5;
        margin-top: 0.25rem;
      }
    }

    .c-spinner {
      position: relative;
      display: inline-block;
      width: 0.75rem;
      height: 0.75rem;
      border: 2px solid currentColor;
      border-top-color: transparent;
      border-radius: 50%;
      animation: video-loader-spin 1.75s infinite linear;

      @include from($mobile-narrow) {
        width: 1rem;
        height: 1rem;
      }
    }
  }

  .c-video-player {
    border-radius: inherit;
  }
}

.is-dark-theme .c-video-details {
  background-color: $background_0;
  border: none;

  .c-video-icon {
    border: none;
  }
}

@keyframes video-loader-spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}
</style>
