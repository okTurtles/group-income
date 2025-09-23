<template lang='pug'>
.c-attachment-download-item
  .c-non-media-card(v-if='fileType === "non-media"')
    .c-non-media-icon
      i.icon-file
    .c-non-media-file-info
      .c-file-name.has-ellipsis(:title='attachment.name') {{ attachment.name }}
      .c-file-ext-and-size
        .c-file-ext {{ fileExt }}
        .c-file-size(v-if='attachment.size') {{ fileSizeDisplay(attachment) }}

  .c-image-card(v-else-if='fileType === "image"')
    img(
      v-if='mediaObjectURL'
      :src='mediaObjectURL'
      :alt='attachment.name'
      @click='attachmentUtils.openImageViewer(mediaObjectURL)'
      @load='attachmentUtils.onMediaSrcSettled(mediaObjectURL, "image")'
      @error='attachmentUtils.onMediaSrcSettled(mediaObjectURL, "image")'
    )
    .loading-box(v-else :style='ephemeral.imgLoadingBoxStyles')

  .c-video-card(v-else-if='fileType === "video"')
    video-player.c-video-player(
      v-if='mediaObjectURL'
      :src='mediaObjectURL'
      :mimeType='attachment.mimeType'
      @load='attachmentUtils.onMediaSrcSettled(mediaObjectURL, "video")'
      @error='attachmentUtils.onMediaSrcSettled(mediaObjectURL, "video")'
      mode='simple'
    )
    .loading-box.c-video-loading(v-else)

  .c-pending-flag(v-if='isPending')
  .c-failed-flag(v-else-if='isFailed')
    i.icon-exclamation-triangle

  .c-attachment-actions-wrapper(
    :class='{ "is-for-media": fileType !== "non-media" }'
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
</template>

<script>
import { getFileExtension, getFileType, formatBytesDecimal } from '@view-utils/filters.js'
import { MESSAGE_VARIANTS } from '@model/contracts/shared/constants.js'
import { L } from '@common/common.js'
import VideoPlayer from '../video-viewer/VideoPlayer.vue'
import Tooltip from '@components/Tooltip.vue'

export default {
  name: 'AttachmentDownloadItem',
  components: {
    Tooltip,
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
        imgLoadingBoxStyles: {}
      }
    }
  },
  computed: {
    fileType () {
      return getFileType(this.attachment.mimeType)
    },
    isImage () {
      return this.fileType === 'image'
    },
    fileExt () {
      return getFileExtension(this.attachment.name, true)
    },
    isPending () {
      return this.variant === MESSAGE_VARIANTS.PENDING
    },
    isFailed () {
      return this.variant === MESSAGE_VARIANTS.FAILED
    }
  },
  methods: {
    fileSizeDisplay ({ size }) {
      return size ? formatBytesDecimal(size) : ''
    },
    getDownloadTooltipText ({ size }) {
      return this.isImage
        ? `${L('Download ({size})', { size: formatBytesDecimal(size) })}`
        : L('Download')
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

  .c-video-loading {
    position: relative;
    width: 100%;
    aspect-ratio: 16/9;
    border-radius: 0;
    margin-bottom: 0;
  }

  .c-video-player {
    border-radius: inherit;
  }
}
</style>
