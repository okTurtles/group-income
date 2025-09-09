<template lang='pug'>
.c-attachment-download-item
  .c-non-media-card(v-if='fileType === "non-media"')
    .c-non-media-icon
      i.icon-file
    .c-non-media-file-info
      .c-file-name.has-ellipsis {{ attachment.name }}
      .c-file-ext-and-size
        .c-file-ext {{ fileExt }}
        .c-file-size(v-if='entry.size') {{ fileSizeDisplay(attachment) }}

  .c-image-card(v-else-if='fileType === "image"')
  .c-video-card(v-else-if='fileType === "video"')

  .c-pending-flag(v-if='isPending')
  .c-failed-flag(v-else-if='isFailed')
    i.icon-exclamation-triangle
  
  .c-attachment-actions-wrapper(
    :class='{ "is-for-image": fileType === "image" }'
  )
    .c-attachment-actions
      tooltip(
        direction='top'
        :text='getDownloadTooltipText(entry)'
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
          @click='deleteAttachment({ index: entryIndex })'
        )
          i.icon-trash-alt

  a.c-invisible-link(ref='downloadHelper')
</template>

<script>
import sbp from '@sbp/sbp'
import { getFileExtension, getFileType, formatBytesDecimal } from '@view-utils/filters.js'
import { MESSAGE_VARIANTS } from '@model/contracts/shared/constants.js'
import { L } from '@common/common.js'
import Tooltip from '@components/Tooltip.vue'

export default {
  name: 'AttachmentDownloadItem',
  components: {
    Tooltip
  },
  props: {
    attachment: {
      type: Object,
      required: true
    },
    variant: {
      type: String,
      required: false
    },
    imageObjectURL: {
      type: String,
      required: false
    },
    canDelete: {
      type: Boolean,
      required: false
    }
  },
  computed: {
    fileType () {
      return getFileType(this.attachment.mimeType)
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
      return this.shouldPreviewImages
        ? `${L('Download ({size})', { size: formatBytesDecimal(size) })}`
        : L('Download')
    },
    async getAttachmentObjectURL (attachment) {
      if (attachment.url) {
        return attachment.url
      } else if (attachment.downloadData) {
        const blob = await sbp('chelonia/fileDownload', new Secret(attachment.downloadData))
        return URL.createObjectURL(blob)
      }
    },
    async downloadAttachment () {
      if (!this.attachment.downloadData) { return }

      // reference: https://blog.logrocket.com/programmatically-downloading-files-browser/
      try {
        let url = this.imageObjectURL
        if (!url) {
          url = await this.getAttachmentObjectURL(attachment)
        }
        const aTag = this.$refs.downloadHelper

        aTag.setAttribute('href', url)
        aTag.setAttribute('download', attachment.name)

        aTag.addEventListener('click', function (event) {
          // NOTE: should call stopPropagation here to keep showing the PinnedMessages dialog
          //       when user trys to download attachment inside the dialog
          event.stopPropagation()
        })

        aTag.click()
      } catch (err) {
        console.error('error caught while downloading a file: ', err)
      }
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
  padding: 0.5rem;

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
  width: 100%;
  height: 100%;
  border-radius: inherit;
  background-color: $general_2;
  max-width: 20rem;
  min-width: 16rem;
  min-height: 3.5rem;

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
    width: calc(100% - 4rem);

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

  &.is-for-image {
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
</style>
