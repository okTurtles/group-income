<template lang="pug">
.c-editor-canvas
  canvas.c-canvas(
    ref='canvas'
    v-if='ephemeral.imageLoaded'
    :width='config.canvas.width'
    :height='config.canvas.height'
  )

  .c-invisible-utils
    img(ref='img' :src='ephemeral.imgSrc' @load='onImageLoad')
</template>

<script>
export default {
  name: 'AvatarEditorCanvas',
  data () {
    return {
      ephemeral: {
        imgSrc: '',
        imageLoaded: false,
        isWiderThanTaller: false
      },
      config: {
        canvas: {
          width: 0,
          height: 0
        }
      }
    }
  },
  methods: {
    onImageLoad () {
      this.ephemeral.imageLoaded = true

      const { naturalWidth, naturalHeight } = this.$refs.img
      this.ephemeral.isWiderThanTaller = naturalWidth / naturalHeight >= 1
    },
    onWindowResize () {
      const rootElComputedStyle = window.getComputedStyle(this.$el)
      const extractStyle = prop => parseFloat(rootElComputedStyle.getPropertyValue(prop))
      
      this.config.canvas.width = extractStyle('width')
      this.config.canvas.height = extractStyle('height')
    }
  },
  created () {
    this.ephemeral.imgSrc = this.$route.query.imageUrl || ''
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
  opacity: 0.7;
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
