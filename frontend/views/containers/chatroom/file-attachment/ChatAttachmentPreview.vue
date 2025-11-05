<template lang='pug'>
.c-attachment-container(ref='container' :class='{ "is-for-download": isForDownload }')

  // Displaying attachments as part of message
  template(v-if='isForDownload')
    .c-non-media-card-container(v-if='hasAttachmentType(config.CHATROOM_ATTACHMENT_TYPES.NON_MEDIA)')
      attachment-download-item(
        v-for='(entry, entryIndex) in sortedAttachments[config.CHATROOM_ATTACHMENT_TYPES.NON_MEDIA]'
        :key='getAttachmentId(entry)'
        :attachment='entry'
        :variant='variant'
        :canDelete='canDelete'
        @download='downloadAttachment(entry)'
        @delete='deleteAttachment({ index: entryIndex, type: config.CHATROOM_ATTACHMENT_TYPES.NON_MEDIA })'
      )

    .c-image-card-container(v-if='hasAttachmentType(config.CHATROOM_ATTACHMENT_TYPES.IMAGE)')
      attachment-download-item(
        v-for='(entry, entryIndex) in sortedAttachments[config.CHATROOM_ATTACHMENT_TYPES.IMAGE]'
        :key='getAttachmentId(entry)'
        :attachment='entry'
        :variant='variant'
        :canDelete='canDelete'
        :mediaObjectURL='mediaObjectURLList.image[entryIndex]'
        @download='downloadAttachment(entry, mediaObjectURLList.image[entryIndex])'
        @delete='deleteAttachment({ index: entryIndex, type: config.CHATROOM_ATTACHMENT_TYPES.IMAGE })'
      )

    .c-video-card-container(v-if='hasAttachmentType(config.CHATROOM_ATTACHMENT_TYPES.VIDEO)')
      attachment-download-item(
        v-for='(entry, entryIndex) in sortedAttachments[config.CHATROOM_ATTACHMENT_TYPES.VIDEO]'
        :key='getAttachmentId(entry)'
        :attachment='entry'
        :variant='variant'
        :canDelete='canDelete'
        :mediaObjectURL='mediaObjectURLList.video[entryIndex]'
        @download='downloadAttachment(entry, mediaObjectURLList.video[entryIndex])'
        @delete='deleteAttachment({ index: entryIndex, type: config.CHATROOM_ATTACHMENT_TYPES.VIDEO })'
      )

  // Displaying attachments as part of <send-area />
  template(v-else)
    send-area-attachments-gallery
      template(v-for='(entry, entryIndex) in attachmentList')
        .c-attachment-preview(
          v-if='fileType(entry) === config.CHATROOM_ATTACHMENT_TYPES.NON_MEDIA'
          :key='entry.url'
          :class='"is-" + fileType(entry)'
        )
          .c-preview-non-media(@click.stop='')
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

        media-preview-in-text-area(
          v-else
          :key='entry.url'
          :attachment='entry'
          @remove='$emit("remove", entry.url)'
          @click='onMediaPreviewCardClick(fileType(entry), entry.url)'
        )

  a.c-invisible-link(ref='downloadHelper')
</template>

<script>
import sbp from '@sbp/sbp'
import AttachmentDownloadItem from './AttachmentDownloadItem.vue'
import MediaPreviewInTextArea from './MediaPreviewInTextArea.vue'
import SendAreaAttachmentsGallery from './SendAreaAttachmentsGallery.vue'
import Tooltip from '@components/Tooltip.vue'
import { MESSAGE_VARIANTS, CHATROOM_ATTACHMENT_TYPES } from '@model/contracts/shared/constants.js'
import { getFileExtension, getFileType } from '@view-utils/filters.js'
import { Secret } from '@chelonia/lib/Secret'
import { OPEN_MODAL, DELETE_ATTACHMENT } from '@utils/events.js'
import { uniq } from 'turtledash'

export default {
  name: 'ChatAttachmentPreview',
  components: {
    Tooltip,
    AttachmentDownloadItem,
    MediaPreviewInTextArea,
    SendAreaAttachmentsGallery
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
        [CHATROOM_ATTACHMENT_TYPES.IMAGE]: [],
        [CHATROOM_ATTACHMENT_TYPES.VIDEO]: []
      },
      settledImgURLList: [],
      config: {
        CHATROOM_ATTACHMENT_TYPES: CHATROOM_ATTACHMENT_TYPES
      }
    }
  },
  computed: {
    sortedAttachments () {
      const collections = {
        [CHATROOM_ATTACHMENT_TYPES.NON_MEDIA]: [],
        [CHATROOM_ATTACHMENT_TYPES.IMAGE]: [],
        [CHATROOM_ATTACHMENT_TYPES.VIDEO]: []
      }

      for (const entry of this.attachmentList) {
        const fType = getFileType(entry.mimeType)
        collections[fType].push(entry)
      }

      return collections
    },
    hasImgAttachments () {
      return this.sortedAttachments[CHATROOM_ATTACHMENT_TYPES.IMAGE].length > 0
    },
    hasVideoAttachments () {
      return this.sortedAttachments[CHATROOM_ATTACHMENT_TYPES.VIDEO].length > 0
    },
    hasMediaAttachments () {
      return this.hasImgAttachments || this.hasVideoAttachments
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
      this.initMediaObjectURLLists()
      sbp('okTurtles.events/on', DELETE_ATTACHMENT, this.deleteAttachment)
    }
  },
  beforeDestroy () {
    if (this.hasMediaAttachments) {
      sbp('okTurtles.events/off', DELETE_ATTACHMENT, this.deleteAttachment)

      if (this.isForDownload) {
        // make sure to revoke all media object URLs when the component is destroyed
        this.revokeAllMediaObjectURLs()
      }
    }
  },
  methods: {
    initMediaObjectURLLists () {
      const types = [
        CHATROOM_ATTACHMENT_TYPES.IMAGE,
        CHATROOM_ATTACHMENT_TYPES.VIDEO
      ]

      for (const mediaType of types) {
        if (this.sortedAttachments[mediaType].length === 0) { continue }

        const promiseToRetrieveURLs = this.sortedAttachments[mediaType]
          .map(async attachment => {
            try {
              if (mediaType === CHATROOM_ATTACHMENT_TYPES.IMAGE) {
                return this.getAttachmentObjectURL(attachment)
              } else {
                if (attachment.url) {
                  return attachment.url
                } else if (attachment.downloadData?.manifestCid) {
                  const cachedArrayBuffer = await sbp('gi.db/filesCache/temporary/load', attachment.downloadData.manifestCid)
                  return cachedArrayBuffer ? URL.createObjectURL(new Blob([cachedArrayBuffer])) : ''
                }
                return ''
              }
            } catch (err) {
              console.error('[ChatAttachmentPreview/initMediaObjectURLList] Error:', err)
              return ''
            }
          })

        Promise.all(promiseToRetrieveURLs).then(urls => {
          this.mediaObjectURLList[mediaType] = urls
        })
      }
    },
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
      // If index is not explicitly provided, look up the index by the URL.
      if (index === undefined && [CHATROOM_ATTACHMENT_TYPES.IMAGE, CHATROOM_ATTACHMENT_TYPES.VIDEO].includes(type) && url) {
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
        const manifestCid = attachment.downloadData.manifestCid
        const cachedArrayBuffer = await sbp('gi.db/filesCache/temporary/load', manifestCid)

        if (cachedArrayBuffer) {
          return URL.createObjectURL(new Blob([cachedArrayBuffer]))
        } else {
          const blob = await sbp('chelonia/fileDownload', new Secret(attachment.downloadData))
          const arrayBuffer = await blob.arrayBuffer()
          sbp('gi.db/filesCache/temporary/save', manifestCid, arrayBuffer)
          return URL.createObjectURL(blob)
        }
      }
    },
    revokeAllMediaObjectURLs () {
      Object.values(this.mediaObjectURLList).forEach(urlList => {
        urlList.forEach(url => URL.revokeObjectURL(url))
      })
    },
    async loadVideoObjectURL (attachment) {
      const downloadData = attachment.downloadData

      if (downloadData?.manifestCid) {
        const manifestCid = downloadData.manifestCid
        const cachedArrayBuffer = await sbp('gi.db/filesCache/temporary/load', manifestCid)
        const blobToUse = cachedArrayBuffer
          ? new Blob([cachedArrayBuffer])
          : (await sbp('chelonia/fileDownload', new Secret(downloadData)))

        const index = this.sortedAttachments[CHATROOM_ATTACHMENT_TYPES.VIDEO]
          .findIndex(a => a.downloadData?.manifestCid === downloadData.manifestCid)

        if (index >= 0) {
          this.mediaObjectURLList[CHATROOM_ATTACHMENT_TYPES.VIDEO] = this.mediaObjectURLList[CHATROOM_ATTACHMENT_TYPES.VIDEO].map((url, i) => {
            if (i !== index) { return url }

            if (url) {
              URL.revokeObjectURL(url)
            }
            return URL.createObjectURL(blobToUse)
          })
        }

        if (!cachedArrayBuffer) {
          const arrayBuffer = await blobToUse.arrayBuffer()
          sbp('gi.db/filesCache/temporary/save', manifestCid, arrayBuffer)
        }
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
    onMediaPreviewCardClick (type, url) {
      const func = ({
        image: this.openImageViewer,
        video: this.openVideoViewer
      })[type]

      func && func(url)
    },
    openVideoViewer (objectURL, additionalData = null) {
      if (objectURL) {
        this.openMediaViewer(CHATROOM_ATTACHMENT_TYPES.VIDEO, objectURL, additionalData)
      }
    },
    openImageViewer (objectURL) {
      if (objectURL) {
        this.openMediaViewer(CHATROOM_ATTACHMENT_TYPES.IMAGE, objectURL)
      }
    },
    openMediaViewer (type, objectURL, additionalData = null) {
      const modalName = ({
        [CHATROOM_ATTACHMENT_TYPES.IMAGE]: 'ImageViewerModal',
        [CHATROOM_ATTACHMENT_TYPES.VIDEO]: 'VideoViewerModal'
      })[type]

      if (!modalName) { return }

      const objURLKey = type === CHATROOM_ATTACHMENT_TYPES.IMAGE ? 'imgUrl' : 'videoUrl'
      const attachmentDetailsList = this.sortedAttachments[type]
        .map((entry, index) => {
          const mediaURL = entry.url || this.mediaObjectURLList[type][index] || ''

          return mediaURL
            ? {
                name: entry.name,
                ownerID: this.ownerID,
                createdAt: this.createdAt || new Date(),
                size: entry.size,
                mimeType: entry.mimeType,
                id: mediaURL,
                [objURLKey]: mediaURL,
                manifestCid: entry.downloadData?.manifestCid
              }
            : null
        }).filter(Boolean)
      const initialIndex = attachmentDetailsList.findIndex(attachment => attachment[objURLKey] === objectURL)

      sbp(
        'okTurtles.events/emit', OPEN_MODAL, modalName,
        null,
        {
          [type === CHATROOM_ATTACHMENT_TYPES.IMAGE ? 'images' : 'videos']: attachmentDetailsList,
          initialIndex: initialIndex === -1 ? 0 : initialIndex,
          canDelete: this.isMsgSender || this.isGroupCreator, // delete-attachment action can only be performed by the sender or the group creator
          ...(additionalData || {})
        }
      )
    },
    onImageSrcSettled (url) {
      this.settledImgURLList = uniq([...this.settledImgURLList, url])

      if (this.sortedAttachments[CHATROOM_ATTACHMENT_TYPES.IMAGE].length === this.settledImgURLList.length) {
        this.$nextTick(() => this.$emit('image-attachments-render-complete'))
      }
    },
    getAttachmentId (attachment) {
      return attachment.downloadData?.manifestCid || attachment.name.replace(/\s+/g, '_')
    }
  },
  watch: {
    sortedAttachments (to, from) {
      if (!this.isForDownload) { return }

      const mediaTypes = [CHATROOM_ATTACHMENT_TYPES.IMAGE, CHATROOM_ATTACHMENT_TYPES.VIDEO]
      for (const mediaType of mediaTypes) {
        const fromList = from[mediaType]
        const toList = to[mediaType]
        const currentObjectURLList = this.mediaObjectURLList[mediaType].slice()

        if (fromList.length > toList.length) {
          if (fromList.length === currentObjectURLList.length) {
            const oldObjectURLMapping = {}

            fromList.forEach((attachment, index) => {
              if (attachment.downloadData) {
                oldObjectURLMapping[attachment.downloadData.manifestCid] = currentObjectURLList[index]
              }
            })
            this.mediaObjectURLList[mediaType] = toList.map(
              attachment => attachment.downloadData ? oldObjectURLMapping[attachment.downloadData.manifestCid] : null
            ).filter(Boolean)

            // revoke object URLs that are no longer needed
            currentObjectURLList.filter(url => url && !this.mediaObjectURLList[mediaType].includes(url)).forEach(url => {
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
        openVideoViewer: this.openVideoViewer,
        onImageSrcSettled: this.onImageSrcSettled,
        loadVideoObjectURL: this.loadVideoObjectURL
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
  width: 100%;
  max-width: 100%;
  gap: 1rem;

  &.is-for-download {
    padding: 0;
    display: flex;
    flex-direction: column;
    align-items: stretch;
    row-gap: 1rem;
    margin-top: 0.75rem;
  }
}

.c-attachment-preview {
  position: relative;
  display: inline-block;
  border: 1px solid $general_0;
  box-shadow: 0 0 4px rgba(29, 28, 29, 0.13);
  border-radius: 0.25rem;
  flex-shrink: 0;

  &.is-non-media {
    max-width: 17.25rem;
    min-width: 14rem;
    min-height: 3.5rem;
  }

  .c-preview-non-media {
    position: relative;
    width: 100%;
    height: 100%;
    border-radius: inherit;
    background-color: $general_2;
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
.c-image-card-container,
.c-video-card-container {
  position: relative;
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
}

.c-video-card-container {
  flex-direction: column;
  flex-wrap: nowrap;
}
</style>
