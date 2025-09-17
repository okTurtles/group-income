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
      avatar-user.viewer-avatar(
        v-if='currentImage.ownerID'
        :contractID='currentImage.ownerID'
        size='sm'
      )

      .media-data
        .name.has-ellipsis {{ displayName }}
        .filename-and-size
          .filename.has-ellipsis {{ currentImage.name }}
          .file-size {{ displayFilesize(currentImage.size) }}

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
@import "@assets/style/components/_media-viewer_utils.scss";

.c-image-viewer-modal {
  @include media-viewer-modal-container($zindex: $zindex-modal);

  --image-viewer-btn-color: #2e3032;
  --image-viewer-slider-bg-color: #2e3032;
  --image-viewer-btn-color_active: #717879;
  --image-viewer-btn-text-color_active: #1e2021;
  --image-viewer-cta-bg-color: #1e2021;
  --image-viewer-cta-text-color: #e8e8e8;
  --image-viewer-cta-border-color: #717879;
  --image-viewer-cta-box-shadow-color: #383c3e;

  .is-dark-theme & {
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
  @include media-viewer-modal-content;
  display: flex;
  flex-direction: row;
  align-items: stretch;
  background-color: var(--viewer-bg-color);
}

.c-modal-header {
  @include media-viewer-modal-header;
}

.c-image-blurry-background {
  position: absolute;
  display: block;
  pointer-events: none;
  filter: blur(50px) brightness(0.4);
  background-position: 50%;
  background-size: contain;
  background-repeat: no-repeat;
  background-color: var(--viewer-bg-color);
  inset: -100px;
}

.c-close-btn {
  position: absolute;
  right: 0.75rem;
  top: 1rem;
  background-color: var(--image-viewer-btn-color);
  color: var(--viewer-text-color);

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
