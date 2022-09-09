<template lang="pug">
.c-qr-code(:style='{ "--side-length": `${sideLength}px` }')
  .c-qr-loading-ani(v-if='!value')
  canvas.c-qr-canvas(v-else ref='canvas')
</template>

<script>
import QRious from 'qrious'
import { mapGetters } from 'vuex'
import { debounce } from '@model/contracts/shared/giLodash.js'

export default ({
  name: 'QrCode',
  props: {
    pixelSize: {
      // pixel size of the QR-code. determines the quality of the image.
      // reference: https://www.npmjs.com/package/qrious#api
      type: Number,
      default: 250
    },
    sideLength: {
      // dimensions of the image being displayed in the app.
      type: Number,
      default: 80
    },
    alpha: {
      // any value between 0 and 1
      type: Number,
      default: 1
    },
    value: {
      type: String,
      default: ''
    }
  },
  data () {
    return {
      config: {
        debouncedUpdate: debounce(this.update, 100)
      },
      ephemeral: {
        qr: null
      }
    }
  },
  computed: {
    ...mapGetters([
      'isDarkTheme'
    ]),
    colorSet () {
      return {
        foreground: this.isDarkTheme ? '#E8E8E8' : '#363636', // var(--text_0)
        background: this.isDarkTheme ? '#383C3E' : '#FFFFFF' // var(--background_0)
      }
    },
    qriousConfig () {
      // reference: https://www.npmjs.com/package/qrious#api
      return {
        ...this.colorSet,
        backgroundAlpha: this.alpha,
        foregroundAlpha: this.alpha,
        level: 'M',
        size: this.pixelSize,
        value: this.value
      }
    }
  },
  methods: {
    createInstance () {
      const canvasEl = this.$refs.canvas

      canvasEl.width = this.sideLength
      canvasEl.height = this.sideLength

      this.ephemeral.qr = new QRious({
        ...this.qriousConfig,
        element: canvasEl
      })
    },
    update () {
      this.ephemeral.qr.set(this.qriousConfig)
    }
  },
  watch: {
    'qriousConfig' () {
      this.config.debouncedUpdate()
    }
  },
  mounted () {
    this.createInstance()

    if (this.value) {
      this.update()
    }
  }
}: Object)
</script>

<style lang="scss" scoped>
@import "@assets/style/_variables.scss";

.c-qr-code {
  position: relative;
  display: inline-block;
  width: var(--side-length);
  height: var(--side-length);
  overflow: hidden;
}

.c-qr-loading-ani,
.c-qr-canvas {
  position: absolute;
  top: 0;
  left: 0;
  width: inherit;
  height: inherit;
}

.c-qr-loading-ani {
  background-color: rgba(0, 0, 0, 0.1);
}

.c-qr-canvas {
  z-index: 1;
  transform-origin: center center;
  // cutting the side-padding from each sides of the image.
  // passing "padding" prop as 0 in to the 'qrious' instance is buggy.
  transform: scale(1.05);
}
</style>
