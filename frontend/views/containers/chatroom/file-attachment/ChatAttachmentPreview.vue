<template lang='pug'>
.c-attachment-container(ref='container' :class='{ "is-for-download": isForDownload }')

  // Displaying attachments as part of message
  template(v-if='isForDownload')
    .c-attachment-preview(
      v-for='(entry, entryIndex) in attachmentList'
      :key='getAttachmentId(entry)'
      class='is-download-item'
      tabindex='0'
    )
      .c-preview-img(v-if='shouldPreviewImages')
        img(
          v-if='objectURLList[entryIndex]'
          :src='objectURLList[entryIndex]'
          :alt='entry.name'
          @click='openImageViewer(objectURLList[entryIndex])'
          @load='onImageSettled(objectURLList[entryIndex])'
          @error='onImageSettled(objectURLList[entryIndex])'
        )
        .loading-box(v-else :style='loadingBoxStyles[entryIndex]')

      .c-preview-non-image(v-else)
        .c-non-image-icon
          i.icon-file

        .c-non-image-file-info
          .c-file-name.has-ellipsis {{ entry.name }}
          .c-file-ext-and-size
            .c-file-ext {{ fileExt(entry) }}
            .c-file-size(v-if='entry.size') {{ fileSizeDisplay(entry) }}

      .c-preview-pending-flag(v-if='isPending')
      .c-preview-failed-flag(v-else-if='isFailed')
        i.icon-exclamation-triangle

      .c-attachment-actions-wrapper(
        :class='{ "is-for-image": shouldPreviewImages }'
      )
        .c-attachment-actions
          tooltip(
            direction='top'
            :text='getDownloadTooltipText(entry)'
          )
            button.is-icon-small(
              :aria-label='L("Download")'
              @click.stop='downloadAttachment(entryIndex)'
            )
              i.icon-download
          tooltip(
            v-if='isMsgSender || isGroupCreator'
            direction='top'
            :text='L("Delete")'
          )
            button.is-icon-small(
              :aria-label='L("Delete")'
              @click='deleteAttachment({ index: entryIndex })'
            )
              i.icon-trash-alt

  // Displaying attachments as part of <send-area />
  template(v-else)
    .c-attachment-preview(
      v-for='(entry, entryIndex) in attachmentList'
      :key='entryIndex'
      :class='"is-" + fileType(entry)'
      @click='openImageViewer(entry.url)'
    )
      img.c-preview-img(
        v-if='fileType(entry) === "image" && entry.url'
        :src='entry.url'
        :alt='entry.name'
      )
      .c-preview-non-image(v-else)
        .c-non-image-icon
          i.icon-file

        .c-non-image-file-info
          .c-file-name.has-ellipsis {{ entry.name }}
          .c-file-ext {{ fileExt(entry) }}

      button.c-attachment-remove-btn(
        type='button'
        :aria-label='L("Remove attachment")'
        @click.stop='$emit("remove", entry.url)'
      )
        i.icon-times

      .c-loader(v-if='isForDownload && !entry.downloadData')

  a.c-invisible-link(ref='downloadHelper')
</template>

<script>
import sbp from '@sbp/sbp'
import Tooltip from '@components/Tooltip.vue'
import { MESSAGE_VARIANTS } from '@model/contracts/shared/constants.js'
import { getFileExtension, getFileType, formatBytesDecimal } from '@view-utils/filters.js'
import { Secret } from '@chelonia/lib/Secret'
import { OPEN_MODAL, DELETE_ATTACHMENT } from '@utils/events.js'
import { L } from '@common/common.js'
import { uniq } from 'turtledash'

export default {
  name: 'ChatAttachmentPreview',
  components: {
    Tooltip
  },
  props: {
    attachmentList: {
      type: Array,
      required: true
    },
    variant: {
      type: String,
      validator (value) {
        return Object.values(MESSAGE_VARIANTS).indexOf(value) !== -1
      }
    },
    isGroupCreator: Boolean,
    isForDownload: Boolean,
    isMsgSender: Boolean,
    ownerID: String,
    createdAt: [Date, String]
  },
  data () {
    return {
      objectURLList: [],
      settledURLList: [],
      loadingBoxStyles: []
    }
  },
  computed: {
    shouldPreviewImages () {
      return this.attachmentList.every(attachment => {
        return this.fileType(attachment) === 'image'
      })
    },
    allImageAttachments () {
      return this.attachmentList.filter(entry => this.fileType(entry) === 'image')
    },
    isPending () {
      return this.variant === MESSAGE_VARIANTS.PENDING
    },
    isFailed () {
      return this.variant === MESSAGE_VARIANTS.FAILED
    }
  },
  mounted () {
    if (this.shouldPreviewImages) {
      const promiseToRetrieveURLs = this.attachmentList.map(attachment => this.getAttachmentObjectURL(attachment))
      Promise.all(promiseToRetrieveURLs).then(urls => {
        this.objectURLList = urls
      })

      if (this.isForDownload) {
        this.loadingBoxStyles = this.attachmentList.map(attachment => {
          return this.getStretchedDimension(attachment.dimension)
        })
      }

      sbp('okTurtles.events/on', DELETE_ATTACHMENT, this.deleteAttachment)
    }
  },
  beforeDestroy () {
    if (this.shouldPreviewImages) {
      sbp('okTurtles.events/off', DELETE_ATTACHMENT, this.deleteAttachment)
    }
  },
  methods: {
    fileExt ({ name }) {
      return getFileExtension(name, true)
    },
    fileSizeDisplay ({ size }) {
      return size ? formatBytesDecimal(size) : ''
    },
    getDownloadTooltipText ({ size }) {
      return this.shouldPreviewImages
        ? `${L('Download ({size})', { size: formatBytesDecimal(size) })}`
        : L('Download')
    },
    fileType ({ mimeType }) {
      return getFileType(mimeType)
    },
    deleteAttachment ({ index, url }) {
      if (url) {
        index = this.objectURLList.indexOf(url)
      }

      if (index >= 0) {
        const attachment = this.attachmentList[index]
        if (attachment.downloadData) {
          this.$emit('delete-attachment', attachment.downloadData.manifestCid)
        }
      }
    },
    async getAttachmentObjectURL (attachment) {
      if (attachment.url) {
        return attachment.url
      } else if (attachment.downloadData) {
        const blob = await sbp('chelonia/fileDownload', new Secret(attachment.downloadData))
        return URL.createObjectURL(blob)
      }
    },
    async downloadAttachment (index) {
      const attachment = this.attachmentList[index]
      if (!attachment.downloadData) { return }

      // reference: https://blog.logrocket.com/programmatically-downloading-files-browser/
      try {
        let url = this.objectURLList[index]
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
    },
    getStretchedDimension ({ width, height }) {
      // NOTE: 320px = 20rem of max-height (.loading-box)
      const maxHeight = 320
      // NOTE: 16px = 2 * 0.5rem of padding (.c-preview-img)
      //       2px = 2 * 1px of border width (.c-attachment-preview)
      const maxWidth = this.$refs.container.clientWidth - 16 - 2
      const zoomRatio = Math.min(maxWidth / width, maxHeight / height, 1)
      const widthInPixel = zoomRatio * width
      const heightInPixel = zoomRatio * height

      return {
        width: `${widthInPixel}px`,
        height: `${heightInPixel}px`
      }
    },
    openImageViewer (objectURL) {
      if (!objectURL) { return }

      const imageAttachmentDetailsList = this.allImageAttachments
        .map((entry, index) => {
          const imgUrl = entry.url || this.objectURLList[index] || ''
          return {
            name: entry.name,
            ownerID: this.ownerID,
            createdAt: this.createdAt || new Date(),
            size: entry.size,
            id: imgUrl,
            imgUrl,
            manifestCid: entry.downloadData?.manifestCid
          }
        })
      const initialIndex = imageAttachmentDetailsList.findIndex(attachment => attachment.imgUrl === objectURL)

      sbp(
        'okTurtles.events/emit', OPEN_MODAL, 'ImageViewerModal',
        null,
        {
          images: imageAttachmentDetailsList,
          initialIndex: initialIndex === -1 ? 0 : initialIndex,
          canDelete: this.isMsgSender || this.isGroupCreator // delete-attachment action can only be performed by the sender or the group creator
        }
      )
    },
    onImageSettled (url) {
      if (this.isForDownload) {
        this.settledURLList = uniq([...this.settledURLList, url])

        if (this.allImageAttachments.length === this.settledURLList.length) {
          // Check if all image attachments are loaded in the DOM, notify the parent component.
          // (This can be enhanced to something like sbp('okTurtles.events/emit', IMAGE_ATTACHMENTS_RENDER_COMPLETE, messageHash) in the future,
          //  if this becomes useful in more places.)
          this.$nextTick(() => this.$emit('image-attachments-render-complete'))
        }
      }
    },
    getAttachmentId (attachment) {
      return attachment.downloadData?.manifestCid || attachment.name.replace(/\s+/g, '_')
    }
  },
  watch: {
    attachmentList (to, from) {
      if (from.length > to.length) {
        // NOTE: this will be caught when user tries to delete attachments
        const oldObjectURLMapping = {}
        if (from.length === this.objectURLList.length) {
          const currentObjectURLList = this.objectURLList.slice()

          from.forEach((attachment, index) => {
            oldObjectURLMapping[attachment.downloadData.manifestCid] = currentObjectURLList[index]
          })
          this.objectURLList = to.map(attachment => oldObjectURLMapping[attachment.downloadData.manifestCid])

          // revoke object URL of a deleted attachment.
          Object.values(oldObjectURLMapping).forEach(oldUrl => {
            if (!this.objectURLList.includes(oldUrl)) {
              URL.revokeObjectURL(oldUrl)
            }
          })
        } else {
          // NOTE: this should not be caught, but considered for the error handler
          Promise.all(to.map(attachment => this.getAttachmentObjectURL(attachment))).then(urls => {
            this.objectURLList = urls
          })
        }
      }
    }
  }
}
</script>

<style lang='scss' scoped>
@import "@assets/style/_variables.scss";

.c-attachment-container {
  position: relative;
  padding: 0 0.5rem;
  margin-top: 0.75rem;
  width: 100%;
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 1rem;

  &.is-for-download {
    padding: 0;

    .c-preview-non-image {
      .c-non-image-file-info {
        width: calc(100% - 4rem);
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
          align-self: flex-start;
          margin-top: 0.5rem;
        }
      }
    }

    .is-download-item {
      &:hover .c-attachment-actions-wrapper {
        display: flex;
        flex-direction: column;
        align-items: flex-end;
      }

      .c-preview-non-image {
        max-width: 20rem;
        min-width: 16rem;
        min-height: 3.5rem;
      }

      .c-preview-img {
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
    }
  }
}

.c-attachment-preview {
  position: relative;
  display: inline-block;
  border: 1px solid $general_0;
  border-radius: 0.25rem;

  &.is-image {
    width: 4.5rem;
    height: 4.5rem;
    cursor: pointer;

    .c-preview-img {
      pointer-events: none;
    }
  }

  &.is-video,
  &.is-non-image {
    max-width: 17.25rem;
    min-width: 14rem;
    min-height: 3.5rem;
  }

  .c-preview-img,
  .c-preview-non-image {
    position: relative;
    width: 100%;
    height: 100%;
    border-radius: inherit;
    background-color: $general_2;
  }

  .c-preview-img {
    object-fit: cover;
  }

  .c-preview-non-image {
    display: grid;
    grid-template-columns: auto 1fr;
    grid-template-rows: 1fr;
    grid-template-areas: "preview-icon preview-info";
    align-items: center;
    padding: 0.5rem;
    gap: 0.5rem;

    .c-non-image-icon {
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

    .c-non-image-file-info {
      grid-area: preview-info;
      position: relative;
      display: block;
      line-height: 1.2;
      width: 100%;

      .c-file-name {
        position: relative;
        font-weight: bold;
        max-width: 13.25rem;
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

  .c-loader {
    position: absolute;
    top: 0;
    left: 0;
    z-index: 1;
    width: 100%;
    height: 100%;
    border-radius: 0.25rem;
    overflow: hidden;

    &::before {
      content: "";
      display: block;
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background-color: $general_1;
      opacity: 0.65;
    }

    &::after {
      content: "";
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
      animation: loadSpin 1.75s infinite linear;
    }
  }

  &.is-download-item {
    &:hover,
    &:focus {
      border-color: $text_1;
    }

    &:active,
    &:focus {
      border-color: $text_0;
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

.c-preview-pending-flag {
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

.c-preview-failed-flag {
  position: absolute;
  top: 0.25rem;
  right: 0.25rem;
  color: $warning_0;
}
</style>
