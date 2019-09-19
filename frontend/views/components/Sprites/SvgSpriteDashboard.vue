<template lang='pug'>
  sprite
</template>
<script>
import Sprite from '@assets/svg/sprites/dashboard.svg'
export default {
  name: 'SvgSpriteDashboard',
  components: { Sprite }
}
</script>
<style lang="scss">
  @import "../../../assets/style/_variables.scss";

  // POC to handle "themable" illustrations.
  // Final solution should be done at #665
  #svg-hello {
    path:nth-child(1) {
      fill: $primary_1;
    }
  }
</style>
