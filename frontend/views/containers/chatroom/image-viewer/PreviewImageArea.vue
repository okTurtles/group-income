<template lang="pug">
.c-image-view-area
  img.c-preview-image(ref='previewImg'
    :src='testImgSrc'
    v-bind='ephemeral.previewImgAttrs'
    :style='previewImgStyles'
    draggable='false'
    @load='onImgLoad'
  )

  .c-zoom-slider-container(
    @pointerdown.stop=''
    @pointermove.stop=''
    @pointerup.stop=''
  )
    slider-continuous.c-zoom-slider(
      :class='{ "show-slider-output": ephemeral.showSliderOutput }'
      uid='zoomslider'
      :value='ephemeral.currentZoom'
      :min='config.zoomMin'
      :max='config.zoomMax'
      :unit='config.sliderUnit'
      @input='handleZoomUpdate'
    )
</template>

<script>
import SliderContinuous from '@components/SliderContinuous.vue'
import pointerEventsMixin from '@view-utils/pointerEventsMixins.js'

export default {
  name: 'PreviewImageArea',
  mixins: [pointerEventsMixin],
  components: {
    SliderContinuous
  },
  data () {
    return {
      testImgSrc: '/assets/images/home-bg.jpeg',
      ephemeral: {
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
    previewImgStyles () {
      const attrs = this.ephemeral.previewImgAttrs
      return {
        height: attrs.height ? `${attrs.height}px` : undefined
      }
    }
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
      const { naturalWidth, naturalHeight, aspectRatio } = this.config.imgData
      let {
        width: viewAreaWidth,
        height: viewAreaHeight
      } = this.$el.getBoundingClientRect()

      viewAreaHeight *= 0.8 // for initial render, use up to 80% of the available height. (close button should be visible)

      let zoomMin = 100 // defaults to 100%
      let minWidth = naturalWidth
      let minHeight = naturalHeight

      // Calculate 'minimum' zoom value. the idea is that,
      // - If the intrinsic size of the image is larger than current view-area: the percentage value that makes the image just fit the available space.
      // - If the intrinsic size of the image is smaller than current view-area: 100%

      if (viewAreaWidth < naturalWidth) {
        const wFraction = viewAreaWidth / naturalWidth
        minWidth = wFraction * naturalWidth
        minHeight = minWidth / aspectRatio
      }

      if (viewAreaHeight < minHeight) {
        minHeight = viewAreaHeight
        minWidth = minHeight * aspectRatio
      }

      zoomMin = Math.ceil(minWidth / naturalWidth * 100)

      this.config.zoomMin = zoomMin
      this.ephemeral.currentZoom = zoomMin
    },
    updatePreviewImage () {
      // update the preview image width/height values based on the current zoom value

      const { naturalWidth, aspectRatio } = this.config.imgData
      const fraction = this.ephemeral.currentZoom / 100
      const widthCalc = fraction * naturalWidth

      this.ephemeral.previewImgAttrs.width = widthCalc
      this.ephemeral.previewImgAttrs.height = widthCalc / aspectRatio
    },
    handleZoomUpdate (e) {
      const val = e.target.value
      this.ephemeral.currentZoom = val
      this.updatePreviewImage()

      if (!this.ephemeral.showSliderOutput) {
        this.ephemeral.showSliderOutput = true
      }

      clearTimeout(this.sliderOutputTimeoutId)
      this.sliderOutputTimeoutId = setTimeout(() => {
        this.ephemeral.showSliderOutput = false
      }, 1500)
    },
    translate ({ x = 0, y = 0 }) {
      console.log('TODO: implement image translation: ', { x, y })
    },
    resizeHandler () {
      // TODO: debounce this handler
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
  cursor: move;
  user-select: none;
}

.c-zoom-slider-container {
  position: absolute;
  left: 1.5rem;
  bottom: 1.5rem;
  z-index: 5;
  padding: 0.25rem 0.75rem 0.75rem;
  border-radius: 0.25rem;
  border: 1px solid $general_0;
}

.c-zoom-slider {
  width: 9.25rem;

  ::v-deep .edge,
  ::v-deep .sOutput {
    display: none;
  }

  ::v-deep .marks {
    margin-top: 0;
  }

  &.show-slider-output ::v-deep .sOutput {
    display: inline-block;
  }
}
</style>
