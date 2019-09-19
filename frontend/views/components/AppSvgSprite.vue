<template lang='pug'>
.foo
  .sprite
    sprite

  // Usage example:
  svg.svg
    use(xlink:href='#hello')
</template>
<script>
import Sprite from '@assets/svg/sprite.svg'
export default {
  name: 'AppSvgSprites',
  components: {
    Sprite
  }
}
</script>
<style lang="scss">
.sprite {
  display: none;
}

.svg {
  width: 100px;
  outline: 1px solid red;
}
</style>
