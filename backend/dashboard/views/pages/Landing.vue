<template lang="pug">
.c-landing-page
  canvas.c-canvas(ref='canvas')
</template>

<script>
import { initAnimation, terminateAnimation } from '@view-utils/3d-animation/landing/index.js'

export default {
  name: 'Landing',
  mounted () {
    initAnimation(this.$refs.canvas)
  },
  beforeDestroy () {
    terminateAnimation()
  }
}
</script>

<style lang="scss" scoped>
.c-landing-page {
  position: absolute;
  display: block;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
}

.c-canvas {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  border: 1px dashed #000;
}
</style>
