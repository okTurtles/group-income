<template lang="pug">
.c-editor-canvas
  canvas.c-canvas(
    ref='canvas'
    v-if='ephemeral.image.loaded'
    :width='ephemeral.canvas.width'
    :height='ephemeral.canvas.height'
  )

  .c-invisible-utils
    img(ref='img' :src='ephemeral.image.src' @load='onImageLoad')
</template>

<script>
import { mapGetters } from 'vuex'

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
          width: 0,
          height: 0
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
  computed: {
    ...mapGetters([
      'isDarkTheme'
    ]),
    isWiderThanTaller () {
      const img = this.ephemeral.image
      return img.loaded && img.intrinsic.aspectRatio <= 1
    },
    clipCircleBgColor () {
      return this.isDarkTheme
        ? 'rgba(56, 60, 62, 0.5)'
        : 'rgba(255, 255, 255, 0.5)'
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

      this.$nextTick(() => {
        this.calculate()
        this.draw()
      })
    },
    onWindowResize () {
      const rootElComputedStyle = window.getComputedStyle(this.$el)
      const extractStyle = prop => parseFloat(rootElComputedStyle.getPropertyValue(prop))

      // re-calculate & reset canvas physical size to be the same as its container
      this.ephemeral.canvas.width = extractStyle('width')
      this.ephemeral.canvas.height = extractStyle('height')

      if (this.ephemeral.image.loaded) {
        this.calculate()
        this.draw()
      }
    },
    calculate () {
      const { canvas, image, clipCircle } = this.ephemeral
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

      console.log('clipCircle: ', clipCircle)
    },
    draw () {
      const cx = this.$refs.canvas.getContext('2d')
      const { image, canvas, clipCircle } = this.ephemeral
      const imgOnCanvas = image.onCanvas
      const canvasCenter = { x: canvas.width / 2, y: canvas.height / 2 }

      // draw image on the canvas
      cx.drawImage(this.$refs.img, imgOnCanvas.x, imgOnCanvas.y, imgOnCanvas.width, imgOnCanvas.height)

      // draw the clipping circle on the canvas
      const cPath = new Path2D()
      cPath.rect(0, 0, canvas.width, canvas.height)
      cPath.moveTo(canvasCenter.x + clipCircle.diameter / 2, canvasCenter.y)
      cPath.arc(canvasCenter.x, canvasCenter.y, clipCircle.diameter / 2, 0, Math.PI * 2, true)

      cx.save()
      cx.fillStyle = this.clipCircleBgColor
      cx.fill(cPath, 'evenodd')
      cx.restore()
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
  background-color: $general_2;
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
  opacity: 0;
  pointer-events: none;
  overflow: hidden;
}
</style>
