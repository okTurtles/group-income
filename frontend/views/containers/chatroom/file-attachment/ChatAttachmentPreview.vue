<template lang='pug'>
.c-attachment-container(ref='container' :class='{ "is-for-download": isForDownload }')
  template(v-if='isForDownload')
    .c-attachment-preview(
      v-for='(entry, entryIndex) in attachmentList'
      :key='entryIndex'
      class='is-download-item'
      tabindex='0'
    )
      .c-preview-non-image(v-if='!shouldPreviewImages')
        .c-non-image-icon
          i.icon-file

        .c-non-image-file-info
          .c-file-name.has-ellipsis {{ entry.name }}
          .c-file-ext {{ fileExt(entry) }}

      .c-preview-img(v-else)
        img(
          v-if='objectURLList[entryIndex]'
          :src='objectURLList[entryIndex]'
          :alt='entry.name'
        )
        .loading-box(v-else :style='loadingBoxStyles[entryIndex]')

      .c-preview-pending-flag(v-if='isPending')
      .c-preview-failed-flag(v-else-if='isFailed')
        i.icon-exclamation-triangle

      .c-attachment-actions-wrapper(
        :class='{ "is-for-image": shouldPreviewImages }'
      )
        .c-attachment-actions
          tooltip(
            direction='top'
            :text='L("Download")'
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
              @click='deleteAttachment(entryIndex)'
            )
              i.icon-trash-alt

  template(v-else)
    .c-attachment-preview(
      v-for='(entry, entryIndex) in attachmentList'
      :key='entryIndex'
      :class='"is-" + fileType(entry)'
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
        @click='$emit("remove", entry.url)'
      )
        i.icon-times

      .c-loader(v-if='isForDownload && !entry.downloadData')

  a.c-invisible-link(ref='downloadHelper')
</template>

<script>
import sbp from '@sbp/sbp'
import Tooltip from '@components/Tooltip.vue'
import { MESSAGE_VARIANTS } from '@model/contracts/shared/constants.js'
import { getFileExtension, getFileType } from '@view-utils/filters.js'
import { Secret } from '~/shared/domains/chelonia/Secret.js'

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
    isMsgSender: Boolean
  },
  data () {
    return {
      objectURLList: [],
      loadingBoxStyles: []
    }
  },
  computed: {
    shouldPreviewImages () {
      return !this.attachmentList.some(attachment => {
        return this.fileType(attachment) === 'non-image'
      })
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
    }
  },
  methods: {
    fileExt ({ name }) {
      return getFileExtension(name, true)
    },
    fileType ({ mimeType }) {
      return getFileType(mimeType)
    },
    deleteAttachment (index) {
      const attachment = this.attachmentList[index]
      if (attachment.downloadData) {
        this.$emit('delete-attachment', attachment.downloadData.manifestCid)
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
    }
  },
  watch: {
    attachmentList (to, from) {
      if (from.length > to.length) {
        // NOTE: this will be caught when user tries to delete attachments
        const oldObjectURLMapping = {}
        if (from.length === this.objectURLList.length) {
          from.forEach((attachment, index) => {
            oldObjectURLMapping[attachment.downloadData.manifestCid] = this.objectURLList[index]
          })
          this.objectURLList = to.map(attachment => oldObjectURLMapping[attachment.downloadData.manifestCid])
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

    .c-preview-non-image .c-non-image-file-info {
      width: calc(100% - 4rem);
    }

    .c-attachment-actions-wrapper {
      display: none;
      position: absolute;
      right: 0.5rem;
      top: 0;
      bottom: 0;

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
      }

      .c-preview-non-image {
        max-width: 20rem;
        min-width: 16rem;
        min-height: 3.5rem;
      }

      .c-preview-img {
        padding: 0.5rem;

        img {
          pointer-events: none;
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

    .c-preview-img {
      pointer-events: none;
    }
  }

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
  position: relative;
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
