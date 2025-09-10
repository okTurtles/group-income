<template lang="pug">
.c-image-viewer-modal(@wheel.prevent.stop='')
  .c-image-viewer-content
    .c-image-blurry-background(:style='blurryBgStyles')
    preview-image-area(
      v-if='currentImage'
      :key='currentImage.id'
      :img-src='currentImage.imgUrl'
      :name='currentImage.name'
      :can-delete='canDelete'
      :deleting='deletingCurrentImage'
      @download='downloadImage'
      @delete-attachment='deleteAttachment'
    )

    header.c-modal-header
      avatar-user.c-avatar(
        v-if='currentImage.ownerID'
        :contractID='currentImage.ownerID'
        size='sm'
      )

      .c-img-data
        .c-name.has-ellipsis {{ displayName }}
        .c-filename-and-size
          .c-filename.has-ellipsis {{ currentImage.name }}
          .c-file-size {{ displayFilesize(currentImage.size) }}

      button.is-icon-small.c-close-btn(
        type='button'
        @click.stop='close'
      )
        i.icon-times

    button.is-icon.c-image-nav-btn.is-prev(
      v-if='showPrevButton'
      type='button'
      @click='selectPrevImage'
    )
      i.icon-chevron-left

    button.is-icon.c-image-nav-btn.is-next(
      v-if='showNextButton'
      type='button'
      @click='selectNextImage'
    )
      i.icon-chevron-right

  a.c-invisible-link(
    ref='downloadHelper'
    @click.stop=''
  )
</template>

<script>
import { mapGetters } from 'vuex'
import sbp from '@sbp/sbp'
import trapFocus from '@utils/trapFocus.js'
import { CLOSE_MODAL, DELETE_ATTACHMENT, DELETE_ATTACHMENT_FEEDBACK } from '@utils/events.js'
import AvatarUser from '@components/AvatarUser.vue'
import PreviewImageArea from './PreviewImageArea.vue'
import { formatBytesDecimal } from '@view-utils/filters.js'

export default {
  // NOTE: gave this component a generic name in case this is used outside the chatroom area. (eg. instead of 'ChatImageViewer' etc.)
  name: 'ImageViewerModal',
  mixins: [trapFocus],
  components: {
    AvatarUser,
    PreviewImageArea
  },
  props: {
    images: Array,
    initialIndex: {
      type: Number,
      required: false,
      default: 0
    },
    canDelete: {
      type: Boolean,
      default: false
    }
  },
  data () {
    return {
      touchMatchMedia: null,
      ephemeral: {
        imagesToShow: [],
        deletingImages: [],
        currentIndex: 0,
        isTouch: false
      }
    }
  },
  computed: {
    ...mapGetters([
      'globalProfile',
      'usernameFromID'
    ]),
    blurryBgStyles () {
      return {
        backgroundImage: `url(${this.currentImage.imgUrl})`
      }
    },
    displayName () {
      const contractID = this.currentImage.ownerID
      return this.globalProfile(contractID)?.displayName ||
        this.usernameFromID(contractID)
    },
    hasMultipleImages () {
      return Array.isArray(this.ephemeral.imagesToShow) && this.ephemeral.imagesToShow.length > 1
    },
    showPrevButton () {
      const len = this.ephemeral.imagesToShow.length
      return len > 1 && this.ephemeral.currentIndex > 0
    },
    showNextButton () {
      const len = this.ephemeral.imagesToShow.length
      return len > 1 && this.ephemeral.currentIndex < len - 1
    },
    currentImage () {
      return this.ephemeral.imagesToShow[this.ephemeral.currentIndex]
    },
    deletingCurrentImage () {
      return this.ephemeral.deletingImages.includes(this.currentImage.manifestCid)
    }
  },
  created () {
    if (!Array.isArray(this.images)) {
      this.$nextTick(() => this.close())
    } else {
      this.ephemeral.currentIndex = this.initialIndex
      this.ephemeral.imagesToShow = this.images
    }

    this.touchMatchMedia = window.matchMedia('(hover: none) and (pointer: coarse)')
    this.ephemeral.isTouch = this.touchMatchMedia.matches
    this.touchMatchMedia.onchange = (e) => {
      this.ephemeral.isTouch = e.matches
    }
  },
  mounted () {
    document.addEventListener('keydown', this.keydownHandler)
    sbp('okTurtles.events/on', DELETE_ATTACHMENT_FEEDBACK, this.onDeleteAttachmentFeedback)
  },
  beforeDestroy () {
    document.removeEventListener('keydown', this.keydownHandler)
    this.touchMatchMedia.onchange = null
    sbp('okTurtles.events/off', DELETE_ATTACHMENT_FEEDBACK, this.onDeleteAttachmentFeedback)
  },
  methods: {
    displayFilesize (size) {
      return `(${formatBytesDecimal(size)})`
    },
    close () {
      sbp('okTurtles.events/emit', CLOSE_MODAL, 'ImageViewerModal')
    },
    selectNextImage () {
      if (this.ephemeral.currentIndex < this.ephemeral.imagesToShow.length - 1) {
        this.ephemeral.currentIndex += 1
      }
    },
    selectPrevImage () {
      if (this.ephemeral.currentIndex > 0) {
        this.ephemeral.currentIndex -= 1
      }
    },
    keydownHandler (e) {
      this.trapFocus(e)

      switch (e.key) {
        case 'ArrowLeft':
          this.selectPrevImage()
          break
        case 'ArrowRight':
          this.selectNextImage()
      }
    },
    downloadImage () {
      const aTag = this.$refs.downloadHelper

      aTag.setAttribute('href', this.currentImage.imgUrl)
      aTag.setAttribute('download', this.currentImage.name)
      aTag.click()
    },
    deleteAttachment () {
      if (this.deletingCurrentImage) {
        return
      }

      sbp('okTurtles.events/emit', DELETE_ATTACHMENT, { type: 'image', url: this.currentImage.imgUrl })
      this.ephemeral.deletingImages.push(this.currentImage.manifestCid)
    },
    onDeleteAttachmentFeedback ({ action, manifestCid }) {
      this.ephemeral.deletingImages = this.ephemeral.deletingImages.filter(cid => cid !== manifestCid)

      if (action === 'complete') {
        this.ephemeral.imagesToShow = this.ephemeral.imagesToShow.filter(image => image.manifestCid !== manifestCid)

        if (this.ephemeral.imagesToShow.length === 0) {
          this.close()
        } else if (this.ephemeral.currentIndex >= this.ephemeral.imagesToShow.length) {
          this.ephemeral.currentIndex = this.ephemeral.imagesToShow.length - 1
        }
      }
    }
  }
}
</script>

<style lang="scss" scoped>
@import "@assets/style/_variables.scss";
$cta-zindex: 3;

.c-image-viewer-modal {
  position: fixed;
  z-index: $zindex-modal;
  top: 0;
  left: 0;
  bottom: 0;
  right: 0;
  overflow: auto;
  background-color: rgba(10, 10, 10, 0.86);

  --image-viewer-bg-color: #1e2021;
  --image-viewer-text-color: #e8e8e8;
  --image-viewer-btn-color: #2e3032;
  --image-viewer-slider-bg-color: #2e3032;
  --image-viewer-btn-color_active: #717879;
  --image-viewer-btn-text-color_active: #1e2021;
  --image-viewer-cta-bg-color: #1e2021;
  --image-viewer-cta-text-color: #e8e8e8;
  --image-viewer-cta-border-color: #717879;
  --image-viewer-cta-box-shadow-color: #383c3e;

  .is-dark-theme & {
    --image-viewer-bg-color: #717879;
    --image-viewer-text-color: #e8e8e8;
    --image-viewer-btn-color: #1e2021;
    --image-viewer-slider-bg-color: #1e2021;
    --image-viewer-btn-color_active: #2e3032;
    --image-viewer-btn-text-color_active: #e8e8e8;
    --image-viewer-cta-bg-color: #1e2021;
    --image-viewer-cta-text-color: #e8e8e8;
    --image-viewer-cta-border-color: #717879;
    --image-viewer-cta-box-shadow-color: #383c3e;
  }
}

.c-image-viewer-content {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  background-color: var(--image-viewer-bg-color);
  width: 100%;
  height: 100%;
  overflow: hidden;
  display: flex;
  flex-direction: row;
  align-items: stretch;

  @include from($tablet) {
    border-radius: 0.375rem;
    width: 92.5vw;
    height: 90vh;
  }
}

.c-modal-header {
  position: absolute;
  width: 100%;
  top: 0;
  left: 0;
  height: auto;
  z-index: $cta-zindex;
  padding: 1rem;
  padding-right: 3rem;
  display: flex;
  flex-direction: row;
  align-items: center;
  column-gap: 0.75rem;

  > * {
    z-index: 1;
  }

  &::after {
    content: "";
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 135%;
    background: linear-gradient(#1e2021bb, #1e202100);
    z-index: 0;
  }

  .c-avatar {
    flex-shrink: 0;
  }

  .c-img-data {
    display: flex;
    flex-direction: column;
    flex-grow: 1;
    line-height: 1.125;
    color: var(--image-viewer-text-color);
  }

  .c-name {
    font-size: $size_4;
    font-weight: 700;
  }

  .c-filename-and-size {
    display: flex;
    flex-direction: row;
    width: 100%;
    column-gap: 0.5rem;
  }

  .c-file-size {
    flex-shrink: 0;
  }

  .c-filename,
  .c-file-size {
    font-size: $size_5;
  }

  .c-name,
  .c-filename,
  .c-file-size {
    user-select: none;
    text-shadow: 1px 1px 2px #1e2021;
  }
}

.c-image-blurry-background {
  position: absolute;
  display: block;
  pointer-events: none;
  filter: blur(50px) brightness(0.4);
  background-position: 50%;
  background-size: contain;
  background-repeat: no-repeat;
  background-color: var(--image-viewer-bg-color);
  inset: -100px;
}

.c-close-btn {
  position: absolute;
  right: 0.75rem;
  top: 1rem;
  background-color: var(--image-viewer-btn-color);
  color: var(--image-viewer-text-color);

  &:hover,
  &:focus {
    background-color: var(--image-viewer-btn-color_active);
    color: var(--image-viewer-btn-text-color_active);
  }
}

button.c-image-nav-btn {
  position: absolute;
  z-index: $cta-zindex;
  top: 50%;
  transform: translateY(-50%);
  background-color: var(--image-viewer-cta-bg-color);
  color: var(--image-viewer-cta-text-color);
  border-color: var(--image-viewer-cta-border-color);
  width: 2.5rem;
  height: 2.5rem;

  &:focus {
    box-shadow: 0 0 0 2px var(--image-viewer-cta-box-shadow-color);
  }

  &.is-prev {
    left: 1rem;
  }

  &.is-next {
    right: 1rem;
  }

  @include phone {
    width: 2rem;
    height: 2rem;
    font-size: 0.75rem;

    &.is-prev {
      left: 0.75rem;
    }

    &.is-next {
      right: 0.75rem;
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
