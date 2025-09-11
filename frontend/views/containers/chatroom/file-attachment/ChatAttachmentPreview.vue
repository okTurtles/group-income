<template lang='pug'>
.c-attachment-container(ref='container' :class='{ "is-for-download": isForDownload }')

  // Displaying attachments as part of message
  template(v-if='isForDownload')
    .c-non-media-card-container(v-if='hasAttachmentType("non-media")')
      AttachmentDownloadItem(
        v-for='(entry, entryIndex) in sortedAttachments["non-media"]'
        :key='getAttachmentId(entry)'
        :attachment='entry'
        :variant='variant'
        :canDelete='canDelete'
        @download='downloadAttachment(entry)'
        @delete='deleteAttachment({ index: entryIndex, type: "non-media" })'
      )

    .c-image-card-container(v-if='hasAttachmentType("image")')
      AttachmentDownloadItem(
        v-for='(entry, entryIndex) in sortedAttachments["image"]'
        :key='getAttachmentId(entry)'
        :attachment='entry'
        :variant='variant'
        :canDelete='canDelete'
        :imageObjectURL='mediaObjectURLList.image[entryIndex]'
        @download='downloadAttachment(entry)'
        @delete='deleteAttachment({ index: entryIndex, type: "image" })'
      )

    .c-video-card-container(v-if='hasAttachmentType("video")')
      AttachmentDownloadItem(
        v-for='(entry, entryIndex) in sortedAttachments["video"]'
        :key='getAttachmentId(entry)'
        :attachment='entry'
        :variant='variant'
        :canDelete='canDelete'
        @download='downloadAttachment(entry)'
        @delete='deleteAttachment({ index: entryIndex, type: "video" })'
      )

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
      .c-preview-non-media(v-else)
        .c-non-media-icon
          i.icon-file

        .c-non-media-file-info
          .c-file-name.has-ellipsis {{ entry.name }}
          .c-file-ext {{ fileExt(entry) }}

      button.c-attachment-remove-btn(
        type='button'
        :aria-label='L("Remove attachment")'
        @click.stop='$emit("remove", entry.url)'
      )
        i.icon-times

  a.c-invisible-link(ref='downloadHelper')
</template>

<script>
import sbp from '@sbp/sbp'
import AttachmentDownloadItem from './AttachmentDownloadItem.vue'
import Tooltip from '@components/Tooltip.vue'
import { MESSAGE_VARIANTS } from '@model/contracts/shared/constants.js'
import { getFileExtension, getFileType } from '@view-utils/filters.js'
import { Secret } from '@chelonia/lib/Secret'
import { OPEN_MODAL, DELETE_ATTACHMENT } from '@utils/events.js'
import { uniq } from 'turtledash'

export default {
  name: 'ChatAttachmentPreview',
  components: {
    Tooltip,
    AttachmentDownloadItem
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
      mediaObjectURLList: {
        'image': [],
        'video': []
      },
      settledImgURLList: [] // TODO: update the logic related to this attribute to accommodate video attachments too.
    }
  },
  computed: {
    sortedAttachments () {
      const collections = {
        'non-media': [],
        'image': [],
        'video': []
      }

      for (const entry of this.attachmentList) {
        const fType = getFileType(entry.mimeType)
        collections[fType].push(entry)
      }

      return collections
    },
    hasMediaAttachments () {
      return this.sortedAttachments['image'].length > 0 || this.sortedAttachments['video'].length > 0
    },
    isPending () {
      return this.variant === MESSAGE_VARIANTS.PENDING
    },
    isFailed () {
      return this.variant === MESSAGE_VARIANTS.FAILED
    },
    canDelete () {
      return this.isMsgSender || this.isGroupCreator
    }
  },
  mounted () {
    if (this.hasMediaAttachments) {
      const mediaTypes = ['image', 'video']
      for (const mediaType of mediaTypes) {
        const attachments = this.sortedAttachments[mediaType]
        if (attachments.length > 0) {
          const promiseToRetrieveURLs = attachments.map(attachment => this.getAttachmentObjectURL(attachment))
          Promise.all(promiseToRetrieveURLs).then(urls => {
            this.mediaObjectURLList[mediaType] = urls
          })
        }
      }

      sbp('okTurtles.events/on', DELETE_ATTACHMENT, this.deleteAttachment)
    }
  },
  beforeDestroy () {
    if (this.hasMediaAttachments) {
      sbp('okTurtles.events/off', DELETE_ATTACHMENT, this.deleteAttachment)
    }
  },
  methods: {
    hasAttachmentType (type) {
      return this.sortedAttachments[type].length > 0
    },
    fileExt ({ name }) {
      return getFileExtension(name, true)
    },
    fileType ({ mimeType }) {
      return getFileType(mimeType)
    },
    deleteAttachment ({ index, url, type }) {
      if (['image', 'video'].includes(type) && url) {
        index = this.mediaObjectURLList[type].indexOf(url)
      }

      if (index >= 0) {
        const attachment = this.sortedAttachments[type][index]
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
    async downloadAttachment (attachment, objectURL = null) {
      if (!attachment.downloadData) { return }

      // reference: https://blog.logrocket.com/programmatically-downloading-files-browser/
      try {
        const url = objectURL || (await this.getAttachmentObjectURL(attachment))

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

      const imageAttachmentDetailsList = this.sortedAttachments['image']
        .map((entry, index) => {
          const imgUrl = entry.url || this.mediaObjectURLList.image[index] || ''
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
        this.settledImgURLList = uniq([...this.settledImgURLList, url])

        if (this.sortedAttachments['image'].length === this.settledImgURLList.length) {
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
    sortedAttachments (to, from) {
      const mediaTypes = ['image', 'video']
      for (const mediaType of mediaTypes) {
        const fromList = from[mediaType]
        const toList = to[mediaType]
        const currentObjectURLList = this.mediaObjectURLList[mediaType].slice()

        if (fromList.length > toList.length) {
          if (fromList.length === currentObjectURLList.length) {
            const oldObjectURLMapping = {}

            fromList.forEach((attachment, index) => {
              oldObjectURLMapping[attachment.downloadData.manifestCid] = currentObjectURLList[index]
            })
            this.mediaObjectURLList[mediaType] = toList.map(attachment => oldObjectURLMapping[attachment.downloadData.manifestCid])

            currentObjectURLList.filter(url => !this.mediaObjectURLList[mediaType].includes(url)).forEach(url => {
              URL.revokeObjectURL(url)
            })
          } else {
            currentObjectURLList.forEach(url => URL.revokeObjectURL(url))

            Promise.all(toList.map(attachment => this.getAttachmentObjectURL(attachment))).then(urls => {
              this.mediaObjectURLList[mediaType] = urls
            })
          }
        }
      }
    }
  },
  provide () {
    return {
      attachmentUtils: {
        getStretchedDimension: this.getStretchedDimension,
        getAttachmentObjectURL: this.getAttachmentObjectURL,
        openImageViewer: this.openImageViewer,
        onImageSettled: this.onImageSettled
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
  max-width: 100%;
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 1rem;

  &.is-for-download {
    padding: 0;
    flex-direction: column;
    align-items: stretch;
    row-gap: 1rem;
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
  &.is-non-media {
    max-width: 17.25rem;
    min-width: 14rem;
    min-height: 3.5rem;
  }

  .c-preview-img,
  .c-preview-non-media {
    position: relative;
    width: 100%;
    height: 100%;
    border-radius: inherit;
    background-color: $general_2;
  }

  .c-preview-img {
    object-fit: cover;
  }

  .c-preview-non-media {
    display: grid;
    grid-template-columns: auto 1fr;
    grid-template-rows: 1fr;
    grid-template-areas: "preview-icon preview-info";
    align-items: center;
    padding: 0.5rem;
    gap: 0.5rem;

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
}

.c-invisible-link {
  position: absolute;
  top: -10rem;
  left: -10rem;
  opacity: 0;
  pointer-events: none;
}

.c-non-media-card-container,
.c-image-card-container {
  position: relative;
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
}
</style>
