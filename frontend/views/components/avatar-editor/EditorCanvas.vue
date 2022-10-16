<template lang="pug">
.c-editor-canvas
  canvas.c-canvas(
    ref='canvas'
    :style='ephemeral.canvas.style'
    :width='ephemeral.canvas.onCanvas.width'
    :height='ephemeral.canvas.onCanvas.height'
    v-if='ephemeral.image.loaded'
  )

  canvas.c-canvas-img-extract(
    ref='helperCanvas'
    :style='{ "width": "50px", "height": "50px" }'
  )

  .c-invisible-utils
    img(ref='img' :src='ephemeral.image.src' @load='onImageLoad')
</template>

<script>
import { mapGetters } from 'vuex'
import { imageDataURItoBlob } from '@utils/image.js'

const EDITED_AVATAR_DIAMETER = 256

export default {
  name: 'AvatarEditorCanvas',
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
          onCanvas: { width: null, height: null }
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

      // re-calculate & reset canvas css size to be the same as its container
      this.ephemeral.canvas.style = {
        width: `${extractStyle('width')}px`,
        height: `${extractStyle('height')}px`
      }
      this.ephemeral.canvas.onCanvas = {
        // if window.devicePixelRatio is not taken into account in the on-canvas dimensions,
        // the image gets blurry (reference: https://developer.mozilla.org/en-US/docs/Web/API/Window/devicePixelRatio#examples)
        width: extractStyle('width') * pixelRatio,
        height: extractStyle('height') * pixelRatio
      }

      if (this.ephemeral.image.loaded) {
        this.$nextTick(() => {
          // re. the usage of $nextTick() here:
          // painting on canvas has to be deferred until canvas DOM size has been updated. (it's a bug-fix)
          this.calculate()
          this.draw()
        })
      }
    },
    calculate () {
      const { image, clipCircle } = this.ephemeral
      const canvas = this.ephemeral.canvas.onCanvas
      const canvasCenter = { x: canvas.width / 2, y: canvas.height / 2 }

      // calculate various on-canvas values of the image
      image.onCanvas.width = canvas.height * (1 / image.intrinsic.aspectRatio)
      image.onCanvas.height = canvas.height
      image.onCanvas.x = canvasCenter.x - image.onCanvas.width / 2
      image.onCanvas.y = 0

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

      // apply transformation to the on-canvas image
      // (NOTE: has to be the last step, because clipCircle is calculated
      //        based on the pre-transformed values of the on-canvas image.)
      this.applyImageTransformation()
    },
    applyImageTransformation () {
      // re-caculate on-canvas size & position of the image with the current transformation options (zoom, translation etc.)
      const { image, canvas } = this.ephemeral
      const canvasCenter = { x: canvas.onCanvas.width / 2, y: canvas.onCanvas.height / 2 }

      // 1. zoom
      if (this.zoom > 1) {
        image.onCanvas.width *= this.zoom
        image.onCanvas.height *= this.zoom
        image.onCanvas.x = canvasCenter.x - image.onCanvas.width / 2
        image.onCanvas.y = canvasCenter.y - image.onCanvas.height / 2
      }
    },
    draw () {
      const cx = this.$refs.canvas.getContext('2d')
      const image = this.ephemeral.image.onCanvas
      const canvas = this.ephemeral.canvas.onCanvas
      const clipCircle = this.ephemeral.clipCircle
      const canvasCenter = { x: canvas.width / 2, y: canvas.height / 2 }

      // 1. draw the background
      cx.fillStyle = this.onCanvasColors.canvasBg
      cx.fillRect(0, 0, canvas.width, canvas.height)

      // 2. draw image
      cx.drawImage(this.$refs.img, image.x, image.y, image.width, image.height)

      // 3. draw the clipping circle
      const cPath = new Path2D()
      cPath.rect(0, 0, canvas.width, canvas.height)
      cPath.moveTo(canvasCenter.x + clipCircle.diameter / 2, canvasCenter.y)
      cPath.arc(canvasCenter.x, canvasCenter.y, clipCircle.diameter / 2, 0, Math.PI * 2, true)

      cx.save()
      cx.fillStyle = this.onCanvasColors.clipCircleBg
      cx.fill(cPath, 'evenodd')
      cx.restore()
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
}

.c-canvas {
  position: relative;
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
  z-index: 1;
  bottom: 1rem;
  right: 1rem;
  border: 2px solid #000;
}
</style>
