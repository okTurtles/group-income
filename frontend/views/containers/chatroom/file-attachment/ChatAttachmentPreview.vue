<template lang='pug'>
.c-attachment-container(:class='{ "is-for-download": isForDownload }')
  template(v-if='isForDownload')
    .c-attachment-preview(
      v-for='entry in attachmentList'
      :key='entry.attachmentId'
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
          v-if='preloadedBlobs[entry.attachmentId]'
          :src='preloadedBlobs[entry.attachmentId].url'
          :alt='entry.name'
        )
        .loading-box(v-else)

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
              @click='downloadAttachment(entry)'
            )
              i.icon-download
          tooltip(
            direction='top'
            :text='L("Delete")'
          )
            button.is-icon-small(
              :aria-label='L("Delete")'
              @click='deleteAttachment(entry)'
            )
              i.icon-trash-alt

  template(v-else)
    .c-attachment-preview(
      v-for='entry in attachmentList'
      :key='entry.attachmentId'
      :class='"is-" + entry.attachType'
    )
      img.c-preview-img(
        v-if='entry.attachType === "image" && entry.url'
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
import { ATTACHMENT_TYPES } from '@model/contracts/shared/constants.js'

export default {
  name: 'ChatAttachmentPreview',
  components: {
    Tooltip
  },
  props: {
    attachmentList: {
      // [ { url: string, name: string, attachType: enum of ['image', 'non-image'] }, ... ]
      type: Array,
      required: true
    },
    isForDownload: {
      type: Boolean,
      default: false
    }
  },
  data () {
    return {
      isPreparingDownload: [],
      preloadedBlobs: {}
    }
  },
  computed: {
    shouldPreviewImages () {
      return !this.attachmentList.some(attachment => attachment.attachType === ATTACHMENT_TYPES.NON_IMAGE)
    }
  },
  mounted () {
    if (this.shouldPreviewImages) {
      (async () => {
        for await (const attachment of this.attachmentList) {
          const blobWithURL = await this.getBlobWithURLFromAttachment(attachment)
          this.preloadedBlobs[attachment.attachmentId] = blobWithURL
        }
        this.$forceUpdate()
      })()
    }
  },
  methods: {
    fileExt ({ name }) {
      const lastDotIndex = name.lastIndexOf('.')
      const ext = lastDotIndex === -1 ? '' : name.substring(lastDotIndex + 1)
      return ext.toUpperCase()
    },
    deleteAttachment (attachment) {
      console.log('TODO - delete attachment')
    },
    async getBlobWithURLFromAttachment (attachment) {
      if (!attachment.downloadData) { return }
      const blob = await sbp('chelonia/fileDownload', attachment.downloadData)
      const url = URL.createObjectURL(blob)
      return { blob, url }
    },
    async downloadAttachment (attachment) {
      if (!attachment.downloadData) { return }

      // reference: https://blog.logrocket.com/programmatically-downloading-files-browser/
      const { name, attachmentId } = attachment
      this.isPreparingDownload = [...this.isPreparingDownload, attachmentId]

      try {
        let blobWithURL = this.preloadedBlobs[attachment.attachmentId]
        if (!blobWithURL) {
          blobWithURL = await this.getBlobWithURLFromAttachment(attachment)
        }
        const aTag = this.$refs.downloadHelper

        aTag.setAttribute('href', blobWithURL.url)
        aTag.setAttribute('download', name)
        aTag.click()

        this.isPreparingDownload = this.isPreparingDownload.filter(v => v !== attachmentId)
      } catch (err) {
        console.error('error caught while downloading a file: ', err)
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
          max-width: 100%;
          max-height: 20rem;

          @include phone {
            max-height: 12rem;
          }
        }

        .loading-box {
          border-radius: 0;
          width: 24rem;
          margin-bottom: 0;

          @include tablet {
            width: 20rem;
          }

          @include phone {
            width: 16rem;
          }
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
    display: inline-block;
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
    cursor: pointer;

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
</style>
