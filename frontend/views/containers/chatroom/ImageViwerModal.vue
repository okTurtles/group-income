<template lang="pug">
.c-image-viewer-modal
  .c-image-viewer-content
    button.is-icon-small.c-close-btn(
      type='button'
      @click.stop='close'
    )
      i.icon-times

    .c-image-blurry-background(:style='blurryBgStyles')
    .c-image-view-area(ref='viewerArea')
      img.c-preview-image(ref='previewImg'
        :src='testImgSrc'
        v-bind='ephemeral.previewImgAttrs'
        @load='onImgLoad')
    p Content placeholder
</template>

<script>
import sbp from '@sbp/sbp'
import trapFocus from '@utils/trapFocus.js'
import { CLOSE_MODAL } from '@utils/events.js'

export default {
  // NOTE: gave this component a generic name in case this is used outside the chatroom area. (eg. instead of 'ChatImageViewer' etc.)
  name: 'ImageViewerModal',
  mixins: [trapFocus],
  data () {
    return {
      testImgSrc: '/assets/images/home-bg.jpeg',
      ephemeral: {
        previewImgAttrs: {
          width: undefined,
          height: undefined
        },
        currentZoom: 0
      },
      config: {
        imgData: {
          naturalWidth: null,
          naturalHeight: null,
          aspectRatio: 1, // intrinsic ratio value of width / height
          zoomMin: 0,
          zoomMax: 400 // for now.
        }
      }
    }
  },
  computed: {
    blurryBgStyles () {
      return {
        backgroundImage: `url(${this.testImgSrc})`
      }
    }
  },
  mounted () {
    document.addEventListener('keydown', this.trapFocus)
  },
  beforeDestroy () {
    document.removeEventListener('keydown', this.trapFocus)
  },
  methods: {
    onImgLoad () {
      const imgEl = this.$refs.previewImg
      const naturalWidth = imgEl.naturalWidth
      const naturalHeight = imgEl.naturalHeight
      const aspectRatio = naturalWidth / naturalHeight

      this.config.imgData.naturalWidth = naturalWidth
      this.config.imgData.naturalHeight = naturalHeight
      this.config.imgData.aspectRatio = aspectRatio
      this.config.imgData.isWiderThanTall = aspectRatio >= 1

      this.initViewerSettings()
      this.updatePreviewImage()
    },
    initViewerSettings () {
      const { naturalWidth, naturalHeight, isWiderThanTall } = this.config.imgData
      const {
        width: viewAreaWidth,
        height: viewAreaHeight
      } = this.$refs.viewerArea.getBoundingClientRect()
      const viewAreaIsWiderThanTall = viewAreaWidth / viewAreaHeight >= 1
      const getMinZoomFromWidth = () => viewAreaWidth > naturalWidth ? 100 : Math.ceil(viewAreaWidth / naturalWidth * 100)
      const getMinZoomFromHeight = () => viewAreaHeight > naturalHeight ? 100 : Math.ceil(viewAreaHeight / naturalHeight * 100)
      let zoomMin
      // Calculate 'minimum' zoom value. the idea is that,
      // - If the intrinsic size of the image is larger than current view-area: the percentage value that makes the image just fit the available space.
      // - If the intrinsic size of the image is smaller than current view-area: 100%
      if (viewAreaIsWiderThanTall) {
        zoomMin = isWiderThanTall
          ? getMinZoomFromHeight()
          : getMinZoomFromWidth()
      } else {
        zoomMin = isWiderThanTall
          ? getMinZoomFromWidth()
          : getMinZoomFromHeight()
      }

      this.config.zoomMin = zoomMin
      this.ephemeral.currentZoom = zoomMin
    },
    updatePreviewImage () {
      // update the preview image width/height values based on the current zoom value
      const { naturalWidth, naturalHeight, aspectRatio, isWiderThanTall } = this.config.imgData
      const fraction = this.ephemeral.currentZoom / 100

      if (isWiderThanTall) {
        const widthCalc = fraction * naturalWidth
        this.ephemeral.previewImgAttrs.width = widthCalc
        this.ephemeral.previewImgAttrs.height = widthCalc / aspectRatio
      } else {
        const heightCalc = fraction * naturalHeight
        this.ephemeral.previewImgAttrs.width = heightCalc
        this.ephemeral.previewImgAttrs.height = heightCalc * aspectRatio
      }
    },
    close () {
      sbp('okTurtles.events/emit', CLOSE_MODAL, 'ImageViewerModal')
    },
    resizeHandler () {
      this.initViewerSettings()
      this.updatePreviewImage()
    }
  },
  mounted () {
    window.addEventListener('resize', this.resizeHandler)
  },
  beforeDestroy () {
    window.removeEventListener('resize', this.resizeHandler)
  }
}
</script>

<style lang="scss" scoped>
@import "@assets/style/_variables.scss";

.c-image-viewer-modal {
  position: fixed;
  z-index: $zindex-modal;
  top: 0;
  left: 0;
  bottom: 0;
  right: 0;
  overflow: auto;
  background-color: rgba(10, 10, 10, 0.86);
}

.c-image-viewer-content {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  background-color: $general_1;
  width: 100%;
  height: 100%;
  overflow: hidden;

  @include from($tablet) {
    border-radius: 0.375rem;
    width: 92.5vw;
    height: 90vh;
  }
}

.c-close-btn {
  position: absolute;
  z-index: 2;
  right: 0.75rem;
  top: 0.75rem;
}

.c-image-view-area {
  position: absolute;
  width: 100%;
  height: 100%;
  top: 0;
  left: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}

img.c-preview-image {
  max-width: unset;
}

.c-image-blurry-background {
  position: absolute;
  pointer-events: none;
  filter: blur(40px) brightness(0.4);
  background-position: 50%;
  background-size: cover;
  inset: -100px;
}
</style>
