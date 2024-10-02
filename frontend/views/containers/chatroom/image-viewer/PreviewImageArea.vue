<template lang="pug">
.c-image-view-area(
  @wheel.prevent.stop='wheelEventHandler'
)
  img.c-preview-image(ref='previewImg'
    :class='{ "is-movable": isImageMovable }'
    :src='imgSrc'
    :width='config.imgData.naturalWidth'
    :height='config.imgData.naturalHeight'
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
      v-if='ephemeral.currentZoom !== null'
      :class='{ "show-slider-output": ephemeral.showSliderOutput }'
      uid='zoomslider'
      :value='ephemeral.currentZoom'
      :min='config.zoomMin'
      :max='config.zoomMax'
      :unit='config.sliderUnit'
      @input='onSliderUpdate'
    )
</template>

<script>
import SliderContinuous from '@components/SliderContinuous.vue'
import pointerEventsMixin from '@view-utils/pointerEventsMixins.js'
import { linearScale } from '@model/contracts/shared/giLodash.js'

const linearScaler = {
  deltaToZoom: linearScale([0, 5], [0, 12]), // maps deltaY value of 'scroll' event to zoom value
  pinchToZoom: linearScale([0, 20], [0, 15]) // maps pinch gesture factor value to zoom value
}

const getSign = v => v < 0 ? -1 : 1

export default {
  name: 'PreviewImageArea',
  mixins: [pointerEventsMixin],
  components: {
    SliderContinuous
  },
  props: {
    imgSrc: {
      type: String,
      required: true
    }
  },
  data () {
    return {
      ephemeral: {
        previewImgAttrs: {
          width: undefined,
          height: undefined
        },
        imgTranslation: { x: 0, y: 0 },
        currentZoom: 100,
        previousZoom: null,
        showSliderOutput: false
      },
      config: {
        imgData: {
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
      const attrs = this.config.imgData
      const tx = this.ephemeral.imgTranslation.x || 0
      const ty = this.ephemeral.imgTranslation.y || 0
      const scaleVal = this.ephemeral.currentZoom / 100

      return {
        height: attrs.naturalHeight ? `${attrs.naturalHeight}px` : undefined,
        transform: `translate(${tx}px, ${ty}px) scale(${scaleVal}, ${scaleVal})`
      }
    },
    isImageMovable () {
      return this.config.zoomMin < this.ephemeral.currentZoom // currentZoom is higher than the minimum value.
    },
    movableDistances () {
      // calculates how much vertical/horizontal spaces are available to move image around in.

      if (!this.isImageMovable) {
        return { x: 0, y: 0 }
      } else {
        const percentDiff = (this.ephemeral.currentZoom - this.config.zoomMin) / 100
        return {
          x: this.config.imgData.naturalWidth * percentDiff / 2,
          y: this.config.imgData.naturalHeight * percentDiff / 2
        }
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
      this.ephemeral.imgTranslation = { x: 0, y: 0 }
    },
    calcPreviewImageDimension () {
      // update the preview image width/height values based on the current zoom value
      const { naturalWidth, aspectRatio } = this.config.imgData
      const fraction = this.ephemeral.currentZoom / 100
      const widthCalc = fraction * naturalWidth

      this.ephemeral.previewImgAttrs.width = widthCalc
      this.ephemeral.previewImgAttrs.height = widthCalc / aspectRatio
    },
    onSliderUpdate (e) {
      this.handleZoomUpdate(e.target.value)
    },
    handleZoomUpdate (val) {
      this.ephemeral.previousZoom = this.ephemeral.currentZoom
      this.ephemeral.currentZoom = val
      const isZoomingOut = this.ephemeral.previousZoom !== null && (this.ephemeral.currentZoom - this.ephemeral.previousZoom) < 0

      this.calcPreviewImageDimension()

      if (isZoomingOut) {
        // NOTE: when the image is being zoomed-out and also it has been translated,
        // it needs a speical auto-translation logic so that the preview iamge doesn't stay off-screen.
        // (No need to apply this when the preview iamge is larger than the view-port area)

        const { width: viewAreaWidth, height: viewAreaHeight } = this.$el.getBoundingClientRect()
        const zoomDiff = (this.ephemeral.currentZoom - this.ephemeral.previousZoom) / 100
        const isPreviewTallerThanViewArea = viewAreaHeight < this.ephemeral.previewImgAttrs.height
        const isPreviewWiderThanViewArea = viewAreaWidth < this.ephemeral.previewImgAttrs.width

        const { naturalWidth, naturalHeight } = this.config.imgData
        let moveX = 0 // x-value to auto-translate
        let moveY = 0 // y-value to auto-translate

        if (!isPreviewWiderThanViewArea && Math.abs(this.ephemeral.imgTranslation.x)) {
          const zoomedOutX = Math.abs(zoomDiff * naturalWidth)
          const absCurrTransX = Math.abs(this.ephemeral.imgTranslation.x)
          const currTransXSign = getSign(this.ephemeral.imgTranslation.x)

          moveX = Math.min(zoomedOutX, absCurrTransX) * currTransXSign * -1
        }

        if (!isPreviewTallerThanViewArea && Math.abs(this.ephemeral.imgTranslation.y)) {
          const zoomedOutY = Math.abs(zoomDiff * naturalHeight)
          const absCurrTransY = Math.abs(this.ephemeral.imgTranslation.y)
          const currTransYSign = getSign(this.ephemeral.imgTranslation.y)

          moveY = Math.min(zoomedOutY, absCurrTransY) * currTransYSign * -1
        }

        this.translate({ x: moveX, y: moveY })
      }

      if (!this.ephemeral.showSliderOutput) {
        this.ephemeral.showSliderOutput = true
      }

      clearTimeout(this.sliderOutputTimeoutId)
      this.sliderOutputTimeoutId = setTimeout(() => {
        this.ephemeral.showSliderOutput = false
      }, 1500)
    },
    translate ({ x = 0, y = 0 }) {
      if (!this.isImageMovable) {
        this.ephemeral.imgTranslation = { x: 0, y: 0 }
      } else {
        const { x: movableX, y: movableY } = this.movableDistances
        let newX = this.ephemeral.imgTranslation.x + x
        let newY = this.ephemeral.imgTranslation.y + y
        const signX = getSign(newX)
        const signY = getSign(newY)

        if (Math.abs(newX) > movableX) {
          newX = signX * movableX
        }
        if (Math.abs(newY) > movableY) {
          newY = signY * movableY
        }

        this.ephemeral.imgTranslation.x = newX
        this.ephemeral.imgTranslation.y = newY
      }
    },
    resizeHandler () {
      // TODO: debounce this handler
      this.initViewerSettings()
      this.calcPreviewImageDimension()
    },
    clipZoomValue (newVal) {
      return newVal > this.config.zoomMax
        ? this.config.zoomMax
        : newVal < this.config.zoomMin
          ? this.config.zoomMin
          : newVal
    },
    pinchInHandler (factor) {
      // should zoom-out (shrink)
      const currZoom = this.ephemeral.currentZoom
      const updateVal = Math.ceil(
        linearScaler.pinchToZoom(factor)
      )
      const newVal = Math.ceil(currZoom - updateVal)

      this.handleZoomUpdate(this.clipZoomValue(newVal))
    },
    pinchOutHandler (factor) {
      // should zoom-in (magnify)
      const currZoom = this.ephemeral.currentZoom
      const updateVal = Math.ceil(
        linearScaler.pinchToZoom(factor)
      )
      const newVal = Math.ceil(currZoom + updateVal)
      this.handleZoomUpdate(this.clipZoomValue(newVal))
    },
    wheelEventHandler (e) {
      // reference: https://kenneth.io/post/detecting-multi-touch-trackpad-gestures-in-javascript

      if (!e.ctrlKey) { return }

      const currZoom = this.ephemeral.currentZoom
      const updateVal = Math.ceil(
        linearScaler.deltaToZoom(Math.abs(e.deltaY))
      )
      let newVal

      if (e.deltaY < 0) {
        // 'zoom-in' action using track-pad
        newVal = currZoom + updateVal
      } else {
        // 'zoom-out' action using track-pad
        newVal = currZoom - updateVal
      }

      if (newVal !== undefined) {
        this.handleZoomUpdate(this.clipZoomValue(newVal))
      }
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
  touch-action: none;
}

img.c-preview-image {
  max-width: unset;
  user-select: none;
  will-change: transform;

  &.is-movable {
    cursor: move;
  }
}

.c-zoom-slider-container {
  position: absolute;
  left: 1rem;
  bottom: 1rem;
  z-index: 5;
  padding: 0.25rem 0.75rem 0.75rem;

  &::after {
    content: "";
    position: absolute;
    width: 100%;
    height: 100%;
    display: block;
    top: 0;
    left: 0;
    z-index: 0;
    background-color: var(--image-viewer-slider-bg-color);
    border-radius: 0.5rem;
    opacity: 0.675;
  }
}

.c-zoom-slider {
  width: 9.25rem;
  z-index: 1;

  ::v-deep .edge {
    display: none;
  }

  ::v-deep .sOutput {
    display: none;
    padding: 0.25rem;
    border-radius: 0.25rem;
    font-size: 0.85em;
    top: -2rem;
  }

  ::v-deep .marks {
    margin-top: 0;
  }

  &.show-slider-output ::v-deep .sOutput {
    display: inline-block;
  }
}
</style>
