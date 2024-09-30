<template lang="pug">
.c-image-viewer-modal
  .c-image-viewer-content
    button.is-icon-small.c-close-btn(
      type='button'
      @click.stop='close'
    )
      i.icon-times

    .c-image-blurry-background(:style='blurryBgStyles')
    preview-image-area(:img-src='ephemeral.imgUrl')
</template>

<script>
import sbp from '@sbp/sbp'
import trapFocus from '@utils/trapFocus.js'
import { CLOSE_MODAL } from '@utils/events.js'
import PreviewImageArea from './PreviewImageArea.vue'

export default {
  // NOTE: gave this component a generic name in case this is used outside the chatroom area. (eg. instead of 'ChatImageViewer' etc.)
  name: 'ImageViewerModal',
  mixins: [trapFocus],
  components: {
    PreviewImageArea
  },
  data () {
    return {
      testImgSrc: '/assets/images/home-bg.jpeg',
      ephemeral: {
        imgUrl: '',
        previewImgAttrs: {
          width: undefined,
          height: undefined
        },
        currentZoom: 0,
        showSliderOutput: false
      },
      config: {
        imgData: {
          minWidth: null,
          minHeight: null,
          naturalWidth: null,
          naturalHeight: null,
          aspectRatio: 1 // intrinsic ratio value of width / height
        },
        zoomMin: 0,
        zoomMax: 400, // for now.
        sliderUnit: '%'
      }
    }
  },
  computed: {
    blurryBgStyles () {
      return {
        backgroundImage: `url(${this.ephemeral.imgUrl})`
      }
    }
  },
  created () {
    const imgUrl = this.$route.query.imageUrl
    if (imgUrl) {
      this.ephemeral.imgUrl = imgUrl
    } else {
      this.close()
    }
  },
  mounted () {
    document.addEventListener('keydown', this.trapFocus)
  },
  beforeDestroy () {
    document.removeEventListener('keydown', this.trapFocus)
  },
  methods: {
    close () {
      sbp('okTurtles.events/emit', CLOSE_MODAL, 'ImageViewerModal')
    }
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

.c-image-blurry-background {
  position: absolute;
  pointer-events: none;
  filter: blur(40px) brightness(0.4);
  background-position: 50%;
  background-size: cover;
  inset: -100px;
}

.c-close-btn {
  position: absolute;
  z-index: 2;
  right: 0.75rem;
  top: 0.75rem;
  background-color: $general_1;

  &:hover,
  &:focus {
    background-color: $general_2;
  }
}
</style>
