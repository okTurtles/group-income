<template lang="pug">
.c-editor-canvas(
  @wheel.prevent='$emit("pointer-wheel", $event)'
)
  template(v-if='ephemeral.image.loaded')
    canvas.c-canvas.bottom(
      data-test='imageCanvas'
      ref='canvas'
      :style='ephemeral.canvas.style'
      v-bind='canvasCommonAttrs'
    )

    canvas.c-canvas.top(
      ref='clip'
      :style='ephemeral.canvas.style'
      v-bind='canvasCommonAttrs'
    )

  .c-invisible-utils
    img(ref='img' data-test='imageHelperTag' :src='ephemeral.image.src' @load='onImageLoad')
    canvas.c-canvas-img-extract(ref='helperCanvas')
</template>

<script>
import { mapGetters } from 'vuex'
import { imageDataURItoBlob } from '@utils/image.js'
import { EDITED_AVATAR_DIAMETER } from './avatar-editor-constants.js'
import pointerEventsMixin from './avatar-editor-pointer-events-setup.js'

export default {
  name: 'AvatarEditorCanvas',
  mixins: [pointerEventsMixin],
  data () {
    return {
      ephemeral: {
        image: {
          src: '',
          loaded: false,
          intrinsic: { width: null, height: null, aspectRatio: null },
          onCanvas: { x: null, y: null, width: null, height: null }
        },
        canvas: {
          style: { width: null, height: null },
          onCanvas: {
            width: null,
            height: null,
            origin: {
              translation: { x: 0, y: 0 },
              rotation: 0
            }
          },
          boundingRect: null
        },
        clipCircle: {
          x: null,
          y: null,
          diameter: 0
        }
      }
    }
  },
  props: {
    zoom: {
      type: Number,
      required: false,
      default: 1
    }
  },
  watch: {
    zoom () {
      this.calculate()
      this.draw()
    }
  },
  computed: {
    ...mapGetters([
      'isDarkTheme',
      'colors'
    ]),
    canvasCommonAttrs () {
      return {
        width: this.ephemeral.canvas.onCanvas.width,
        height: this.ephemeral.canvas.onCanvas.height
      }
    },
    isWiderThanTaller () {
      const img = this.ephemeral.image
      return img.loaded && img.intrinsic.aspectRatio <= 1
    },
    onCanvasColors () {
      return {
        clipCircleBg: this.isDarkTheme ? 'rgba(46, 48, 50, 0.5)' : 'rgba(245, 245, 245, 0.5)', // $general_2 with opacity .5
        canvasBg: this.colors['general_2']
      }
    }
  },
  methods: {
    onImageLoad () {
      // once the image is loaded, extract the image info regarding the intrinsic size that are needed in
      // calculation of the iamge drawn on the canvas.
      const img = this.ephemeral.image
      const { naturalWidth, naturalHeight } = this.$refs.img

      img.loaded = true
      img.intrinsic.width = naturalWidth
      img.intrinsic.height = naturalHeight
      img.intrinsic.aspectRatio = naturalHeight / naturalWidth

      // init helper-canvas
      this.$refs.helperCanvas.width = EDITED_AVATAR_DIAMETER
      this.$refs.helperCanvas.height = EDITED_AVATAR_DIAMETER

      this.$nextTick(() => {
        this.calculate()
        this.draw()
      })
    },
    onWindowResize () {
      const pixelRatio = window.devicePixelRatio || 1
      const rootElComputedStyle = window.getComputedStyle(this.$el)
      const extractStyle = prop => parseFloat(rootElComputedStyle.getPropertyValue(prop))

      // canvas css width & height has to be the same as thier container
      this.ephemeral.canvas.style.width = `${extractStyle('width')}px`
      this.ephemeral.canvas.style.height = `${extractStyle('height')}px`
      // if window.devicePixelRatio is not taken into account in the on-canvas dimensions, the image gets blurry
      // (reference: https://developer.mozilla.org/en-US/docs/Web/API/Window/devicePixelRatio#examples)
      this.ephemeral.canvas.onCanvas.width = extractStyle('width') * pixelRatio
      this.ephemeral.canvas.onCanvas.height = extractStyle('height') * pixelRatio

      if (this.ephemeral.image.loaded) {
        this.$nextTick(() => {
          // re. the usage of $nextTick() here:
          // painting on canvas has to be deferred until canvas DOM size has been updated. (it's a bug-fix)
          this.calculate()
          this.draw()
        })
      }
    },
    calculate (isForZoomChange = false) {
      const { image, clipCircle } = this.ephemeral
      const canvas = this.ephemeral.canvas.onCanvas
      const canvasCenter = { x: canvas.width / 2, y: canvas.height / 2 }

      // calculate various on-canvas values of the image
      image.onCanvas.width = canvas.height * (1 / image.intrinsic.aspectRatio) // always respect the instrinsic aspect ratio of the image
      image.onCanvas.height = canvas.height

      // calculate the values of the clipping clipping circle
      if (this.isWiderThanTaller) {
        clipCircle.diameter = canvas.height
        clipCircle.x = canvasCenter.x - clipCircle.diameter / 2
        clipCircle.y = 0
      } else {
        clipCircle.diameter = image.onCanvas.width
        clipCircle.x = canvasCenter.x - clipCircle.diameter / 2
        clipCircle.y = canvasCenter.y - clipCircle.diameter / 2
      }

      // scale the on-canvas image dimension based on the current zoom value
      if (this.zoom > 1) {
        image.onCanvas.width *= this.zoom
        image.onCanvas.height *= this.zoom
      }

      // center the on-canvas image relative to the canvas origin
      image.onCanvas.x = -1 * (image.onCanvas.width / 2)
      image.onCanvas.y = -1 * (image.onCanvas.height / 2)

      this.adjustOriginTranslation()
    },
    draw () {
      const cx = this.$refs.canvas.getContext('2d')
      const image = this.ephemeral.image.onCanvas
      const canvas = this.ephemeral.canvas.onCanvas
      const clipCircle = this.ephemeral.clipCircle
      const circleRadius = clipCircle.diameter / 2
      const canvasCenter = { x: canvas.width / 2, y: canvas.height / 2 }

      cx.clearRect(0, 0, canvas.width, canvas.height)

      // 1. draw the background
      cx.fillStyle = this.onCanvasColors.canvasBg
      cx.fillRect(0, 0, canvas.width, canvas.height)

      // 2. apply origin transformation to the bottom canvas
      cx.save()
      cx.translate(
        canvasCenter.x + canvas.origin.translation.x,
        canvasCenter.y + canvas.origin.translation.y
      )

      // 3. paint the image on the bottom canvas
      cx.drawImage(this.$refs.img, image.x, image.y, image.width, image.height)
      cx.restore()

      // 4. draw a mask on the top canvas
      const cx2 = this.$refs.clip.getContext('2d')
      cx2.clearRect(0, 0, canvas.width, canvas.height)
      cx2.fillStyle = this.onCanvasColors.clipCircleBg
      cx2.fillRect(0, 0, canvas.width, canvas.height)

      // 5. paint the image again on the top canvas with a circlular clipping-path applied
      cx2.beginPath()
      cx2.moveTo(canvasCenter.x + circleRadius, canvasCenter.y)
      cx2.arc(canvasCenter.x, canvasCenter.y, circleRadius, 0, Math.PI * 2, true)
      cx2.save()
      cx2.clip()
      cx2.drawImage(
        this.$refs.canvas,
        clipCircle.x,
        clipCircle.y,
        clipCircle.diameter,
        clipCircle.diameter,
        clipCircle.x,
        clipCircle.y,
        clipCircle.diameter,
        clipCircle.diameter
      )
      cx2.restore()
    },
    extractEditedImage () {
      const { canvas, helperCanvas } = this.$refs
      const { clipCircle } = this.ephemeral
      const cx = helperCanvas.getContext('2d')

      cx.drawImage(
        canvas,
        clipCircle.x,
        clipCircle.y,
        clipCircle.diameter,
        clipCircle.diameter,
        0,
        0,
        helperCanvas.width,
        helperCanvas.height
      )

      return imageDataURItoBlob(helperCanvas.toDataURL('image/jpeg'))
    },
    translate ({ x = 0, y = 0 }) {
      this.ephemeral.canvas.onCanvas.origin.translation.x += x
      this.ephemeral.canvas.onCanvas.origin.translation.y += y

      this.adjustOriginTranslation()
      this.draw()
    },
    adjustOriginTranslation () {
      // limit translating of image to the points where the clipping circle never goes beyond
      // the bounding-box of the on-canvas image.

      const { canvas, clipCircle } = this.ephemeral
      const image = this.ephemeral.image.onCanvas
      const originTranslation = canvas.onCanvas.origin.translation
      const onCanvasCenter = { x: canvas.onCanvas.width / 2, y: canvas.onCanvas.height / 2 }

      const onCanvasImageTopLeft = {
        x: onCanvasCenter.x + originTranslation.x + image.x,
        y: onCanvasCenter.y + originTranslation.y + image.y
      }
      const onCanvasImageBottomRight = {
        x: onCanvasImageTopLeft.x + image.width,
        y: onCanvasImageTopLeft.y + image.height
      }

      // if the applied translation makes the image go beyond its limit,
      // adjust the value of the translation.
      if (onCanvasImageTopLeft.x > clipCircle.x) {
        originTranslation.x -= (onCanvasImageTopLeft.x - clipCircle.x)
      } else if (onCanvasImageBottomRight.x < (clipCircle.x + clipCircle.diameter)) {
        originTranslation.x += ((clipCircle.x + clipCircle.diameter) - onCanvasImageBottomRight.x)
      }

      if (onCanvasImageTopLeft.y > clipCircle.y) {
        originTranslation.y -= (onCanvasImageTopLeft.y - clipCircle.y)
      } else if (onCanvasImageBottomRight.y < (clipCircle.y + clipCircle.diameter)) {
        originTranslation.y += ((clipCircle.y + clipCircle.diameter) - onCanvasImageBottomRight.y)
      }
    }
  },
  created () {
    this.ephemeral.image.src = this.$route.query.imageUrl || ''
  },
  mounted () {
    this.onWindowResize()
    window.addEventListener('resize', this.onWindowResize)
  },
  beforeDestroy () {
    window.removeEventListener('resize', this.onWindowResize)
  }
}
</script>

<style lang="scss" scoped>
@import "@assets/style/_variables.scss";

.c-editor-canvas {
  position: relative;
  display: block;
  width: 100%;
  height: 15.625rem;
  overflow: hidden;
  cursor: move;
}

.c-canvas {
  position: absolute;
  touch-action: none;
  top: 0;
  left: 0;

  &.bottom {
    filter: brightness(0.8) blur(4px);
  }
}

.c-invisible-utils {
  position: absolute;
  width: 1px;
  height: 1px;
  top: -10rem;
  left: -10rem;
  pointer-events: none;
  overflow: hidden;
}

.c-canvas-img-extract {
  position: absolute;
}
</style>
