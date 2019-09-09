<template lang='pug'>
svg.c-svg(
  v-if='animationActive'
  xmlns='http://www.w3.org/2000/svg'
  xmlns:xlink='http://www.w3.org/1999/xlink'
  ref='svg'
)
  component(
    v-for='(confetti, index) in confettis'
    v-bind='confetti.props'
    :key='index'
    :is='confetti.confettiType'
  )
</template>

<script>
import animationMixins from './AnimationMixins.js'
export default {
  mixins: [animationMixins],
  name: 'ConfettiAnimation'
}
</script>

<style lang="scss" scoped>
.c-svg {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: -3;
}
</style>
