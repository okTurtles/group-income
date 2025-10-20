<template lang="pug">
.c-image-view-area(
  @wheel.prevent.stop='wheelEventHandler'
  @mousedown='mouseDownHandler'
  @mouseup='mouseUpHandler'
)
  img.c-preview-image(ref='previewImg'
    :class='{ "is-movable": isImageMovable, "is-hidden": !ephemeral.imgInitDone }'
    :src='imgSrc'
    :width='config.imgData.naturalWidth'
    :height='config.imgData.naturalHeight'
    :style='previewImgStyles'
    :alt='L("Image preview")'
    draggable='false'
    @load='onImgLoad'
  )

  .c-cta-container(
    v-if='ephemeral.isLoaded'
    @pointerdown.stop=''
    @pointermove.stop=''
    @pointerup.stop=''
    @mousedown.stop=''
    @mouseup.stop=''
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

    .c-btns-container
      button.is-icon-small.c-cta-btn(
        :aria-label='L("Download")'
        @click.stop='$emit("download")'
      )
        i.icon-download

      button.is-icon-small.c-cta-btn(
        v-if='canDelete'
        :aria-label='L("Delete")'
        :disabled='deleting'
        :class='{ "is-loader": deleting }'
        :data-loading='deleting'
        @click.stop='$emit("delete-attachment")'
      )
        i.icon-trash-alt(v-if='!deleting')

  .c-loader-animation(v-if='!ephemeral.isLoaded')
</template>

<script>
import SliderContinuous from '@components/SliderContinuous.vue'
import pointerEventsMixinFactory from '@view-utils/pointerEventsMixins.js'
import { linearScale, debounce } from 'turtledash'

const linearScaler = {
  deltaToZoom: linearScale([0, 5], [0, 12]), // maps deltaY value of 'scroll' event to zoom value
  pinchToZoom: linearScale([0, 20], [0, 15]) // maps pinch gesture factor value to zoom value
}

const getSign = v => v < 0 ? -1 : 1

export default {
  name: 'PreviewImageArea',
  mixins: [pointerEventsMixinFactory({ pointerMoveOnWindow: true })],
  components: {
    SliderContinuous
  },
  props: {
    imgSrc: {
      type: String,
      required: true
    },
    name: String,
    canDelete: {
      type: Boolean,
      default: false
    },
    deleting: {
      type: Boolean,
      default: true
    }
  },
  data () {
    return {
      ephemeral: {
        isLoaded: false,
        imgInitDone: false,
        previewImgAttrs: {
          width: undefined,
          height: undefined,
          topX: undefined,
          topY: undefined
        },
        imgTranslation: { x: 0, y: 0 },
        currentZoom: 100,
        previousZoom: null,
        pointedZoomAction: {
          percentX: null,
          percentY: null,
          zoomCenter: null
        },
        mousedownCapture: null,
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
        sliderUnit: '%',
        resizeHandlerDebounced: debounce(this.resizeHandler, 100)
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
        transform: `translate3d(${tx}px, ${ty}px, 0px) scale(${scaleVal}, ${scaleVal})`
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

      this.ephemeral.isLoaded = true
      this.config.imgData.naturalWidth = naturalWidth
      this.config.imgData.naturalHeight = naturalHeight
      this.config.imgData.aspectRatio = aspectRatio
      this.config.imgData.isWiderThanTall = aspectRatio >= 1

      this.initViewerSettings()
      this.calcPreviewImageDimension()

      this.$nextTick(() => {
        this.ephemeral.imgInitDone = true
      })
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
      const center = this.getViewAreaCenter()
      const { x: transX, y: transY } = this.ephemeral.imgTranslation
      const widthCalc = fraction * naturalWidth
      const heightCalc = widthCalc / aspectRatio

      this.ephemeral.previewImgAttrs.width = widthCalc
      this.ephemeral.previewImgAttrs.height = heightCalc
      this.ephemeral.previewImgAttrs.topX = center.x - widthCalc / 2 + transX
      this.ephemeral.previewImgAttrs.topY = center.y - heightCalc / 2 + transY
    },
    getViewAreaCenter () {
      const {
        width: viewAreaWidth,
        height: viewAreaHeight,
        top: viewAreaTop,
        left: viewAreaLeft
      } = this.$el.getBoundingClientRect()

      return {
        x: viewAreaLeft + viewAreaWidth / 2,
        y: viewAreaTop + viewAreaHeight / 2
      }
    },
    isPointInsidePreviewImage ({ x, y }) {
      // check if the given point is within the currently-scaled preview-image.
      const center = this.getViewAreaCenter()
      const { width, height } = this.ephemeral.previewImgAttrs
      const { x: transX, y: transY } = this.ephemeral.imgTranslation
      const half = { w: width / 2, h: height / 2 }
      const boundary = {
        top: transY + center.y - half.h,
        left: transX + center.x - half.w,
        bottom: transY + center.y + half.h,
        right: transX + center.x + half.w
      }

      return x > boundary.left &&
        x < boundary.right &&
        y > boundary.top &&
        y < boundary.bottom
    },
    onSliderUpdate (e) {
      const center = this.getViewAreaCenter()
      this.handleZoomUpdate(Number(e.target.value), center)
      this.calcPreviewImageDimension()
      this.clearPointedZoomActionState()
    },
    handleZoomUpdate (val, zoomPoint = null) {
      const twoPointsAreSame = (p1, p2) => {
        return p1 && p2 && p1?.x === p2.x && p1?.y === p2?.y
      }
      this.ephemeral.previousZoom = this.ephemeral.currentZoom
      this.ephemeral.currentZoom = val

      if (zoomPoint) {
        let centerUpdated = false

        if (!twoPointsAreSame(zoomPoint, this.ephemeral.pointedZoomAction.zoomCenter)) {
          this.ephemeral.pointedZoomAction.zoomCenter = zoomPoint
          centerUpdated = true
        }

        const { width: prevWidth, height: prevHeight, topX: prevTopX, topY: prevTopY } = this.ephemeral.previewImgAttrs
        const center = this.ephemeral.pointedZoomAction.zoomCenter
        let percentX = this.ephemeral.pointedZoomAction.percentX
        let percentY = this.ephemeral.pointedZoomAction.percentY

        if (percentX === null || centerUpdated) {
          percentX = (center.x - prevTopX) / prevWidth
          percentX = parseFloat(percentX.toFixed(2))

          this.ephemeral.pointedZoomAction.percentX = percentX // need to record it
        }

        if (percentY === null || centerUpdated) {
          percentY = (center.y - prevTopY) / prevHeight
          percentY = parseFloat(percentY.toFixed(2))

          this.ephemeral.pointedZoomAction.percentY = percentY // need to record it
        }

        this.calcPreviewImageDimension()
        const { width: afterWidth, height: afterHeight, topX: afterTopX, topY: afterTopY } = this.ephemeral.previewImgAttrs
        const toX = Math.ceil(afterTopX + afterWidth * percentX)
        const toY = Math.ceil(afterTopY + afterHeight * percentY)
        this.translate({ x: (toX - center.x) * -1, y: (toY - center.y) * -1 })
      } else {
        this.calcPreviewImageDimension()

        const { naturalWidth, naturalHeight } = this.config.imgData
        const zoomDiff = (this.ephemeral.currentZoom - this.ephemeral.previousZoom) / 100
        let moveX = 0 // x-value to auto-translate
        let moveY = 0 // y-value to auto-translate

        if (this.ephemeral.imgTranslation.x !== 0) {
          const wUpdate = zoomDiff * naturalWidth

          moveX = wUpdate * -0.5
        }

        if (this.ephemeral.imgTranslation.y !== 0) {
          const hUpdate = zoomDiff * naturalHeight

          moveY = hUpdate * -0.5
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
    translate ({ x = 0, y = 0 }, override = false) {
      if (!this.isImageMovable) {
        this.ephemeral.imgTranslation = { x: 0, y: 0 }
      } else if (override) {
        this.ephemeral.imgTranslation = { x, y }
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

        this.calcPreviewImageDimension()
      }
    },
    resizeHandler () {
      this.initViewerSettings()
      this.calcPreviewImageDimension()
      this.clearPointedZoomActionState()
    },
    clipZoomValue (newVal) {
      return newVal > this.config.zoomMax
        ? this.config.zoomMax
        : newVal < this.config.zoomMin
          ? this.config.zoomMin
          : newVal
    },
    pinchInHandler ({ changeFactor, center }) {
      if (!this.isPointInsidePreviewImage(center)) { return }

      // should zoom-out (shrink)
      const currZoom = this.ephemeral.currentZoom
      const updateVal = Math.ceil(
        linearScaler.pinchToZoom(changeFactor)
      )
      const newVal = Math.ceil(currZoom - updateVal)
      this.handleZoomUpdate(this.clipZoomValue(newVal), center)
    },
    pinchOutHandler ({ changeFactor, center }) {
      if (!this.isPointInsidePreviewImage(center)) { return }

      // should zoom-in (magnify)
      const currZoom = this.ephemeral.currentZoom
      const updateVal = Math.ceil(
        linearScaler.pinchToZoom(changeFactor)
      )

      const newVal = Math.ceil(currZoom + updateVal)
      this.handleZoomUpdate(this.clipZoomValue(newVal), center)
    },
    wheelEventHandler (e) {
      // reference: https://kenneth.io/post/detecting-multi-touch-trackpad-gestures-in-javascript
      const point = { x: e.clientX, y: e.clientY }

      if (!e.ctrlKey || !this.isPointInsidePreviewImage(point)) { return }

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
        this.handleZoomUpdate(this.clipZoomValue(newVal), point)
      }
    },
    clearPointedZoomActionState () {
      this.ephemeral.pointedZoomAction.percentX = null
      this.ephemeral.pointedZoomAction.percentY = null
      this.ephemeral.pointedZoomAction.zoomCenter = null
    },
    postPointerCancel () {
      this.clearPointedZoomActionState()
    },
    mouseDownHandler (e) {
      const point = { x: e.clientX, y: e.clientY }
      this.ephemeral.mousedownCapture = this.matchMedia.isTouch || !this.isPointInsidePreviewImage(point)
        ? null
        : point
    },
    mouseUpHandler (e) {
      if (this.matchMedia.isTouch || !this.ephemeral.mousedownCapture) { return }

      const point = { x: e.clientX, y: e.clientY }
      const mdownPoint = this.ephemeral.mousedownCapture
      const distance = (() => {
        const dx = Math.abs(point.x - mdownPoint.x)
        const dy = Math.abs(point.y - mdownPoint.y)
        return Math.sqrt(dx * dx + dy * dy)
      })()

      if (distance < 1.5) {
        const shouldZoomOut = this.isImageMovable
        const center = this.getViewAreaCenter()
        if (shouldZoomOut) {
          this.handleZoomUpdate(this.config.zoomMin, center)
        } else {
          const zoomInVal = this.config.zoomMin < 70
            ? 100
            : this.config.zoomMin < 100
              ? 150
              : 200
          this.handleZoomUpdate(zoomInVal, mdownPoint)
        }

        this.calcPreviewImageDimension()
        this.clearPointedZoomActionState()
        this.ephemeral.mousedownCapture = null
      }
    }
  },
  mounted () {
    window.addEventListener('resize', this.config.resizeHandlerDebounced)
  },
  beforeDestroy () {
    window.removeEventListener('resize', this.config.resizeHandlerDebounced)
  }
}
</script>

<style lang="scss" scoped>
@import "@assets/style/_variables.scss";

.c-image-view-area {
  position: relative;
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  touch-action: none;
  flex-shrink: 0;
  overflow: hidden;
}

img.c-preview-image {
  max-width: unset;
  user-select: none;
  will-change: transform;
  cursor: zoom-in;

  &.is-movable {
    cursor: zoom-out;
  }

  &.is-hidden {
    opacity: 0;
  }
}

.c-cta-container {
  position: absolute;
  left: 1rem;
  bottom: 1rem;
  z-index: 5;
  padding: 0.25rem 0.75rem 0.75rem;
  display: flex;
  align-items: center;
  justify-content: flex-start;
  column-gap: 0.75rem;

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

    @include if-forced-color-mode {
      border: 1px solid buttonborder;
      opacity: 1;
    }
  }
}

.c-btns-container {
  display: flex;
  align-items: center;
  transform: translateY(0.25rem);
  column-gap: 0.5rem;
  z-index: 1;

  button.c-cta-btn {
    color: var(--image-viewer-cta-color);
    background-color: var(--image-viewer-slider-bg-color);
    border-radius: 0.25rem;
    border: 1px solid var(--image-viewer-cta-color);

    @include phone {
      font-size: 0.75rem;
      width: 1.5rem;
      height: 1.5rem;
    }

    &:hover,
    &:focus {
      color: var(--image-viewer-cta-color_active);
      border-color: var(--image-viewer-cta-color_active);
    }

    &.is-loader::after {
      width: 0.75rem;
      height: 0.75rem;
      color: var(--image-viewer-cta-color);
    }
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

  ::v-deep input.sInput {
    forced-color-adjust: none;

    @include if-forced-color-mode {
      background: none;
      border: 1px solid buttonborder;
      color: buttontext;
    }
  }
}

.c-loader-animation {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  pointer-events: none;
  width: 1.5rem;
  height: 1.5rem;
  border: 2px solid;
  border-top-color: transparent;
  border-radius: 50%;
  color: var(--viewer-text-color);
  animation: loader-ani 1.75s infinite linear;
  z-index: 2;

  @include desktop {
    width: 1.75rem;
    height: 1.75rem;
  }
}

@keyframes loader-ani {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}
</style>
