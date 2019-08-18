<template lang="pug">
transition(
  @enter='maskEnter'
  @leave='maskLeave'
  :css='false'
)
  .c-mask(v-if='isActive')
</template>

<script>
import mixinTransitions from './mixinTransitions.js'

export default {
  name: 'Masker',
  mixins: [mixinTransitions],
  props: {
    isActive: Boolean,
    elementsSize: Object
  }
}
</script>

<style lang="scss" scoped>
@import "../../../../assets/style/_variables.scss";

.c-mask {
  pointer-events: none;
  position: fixed;
  opacity: 0;
  background: $primary_2;
  border-radius: $radius;
  z-index: $zindex-mask;
}
</style>
