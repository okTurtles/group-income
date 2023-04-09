<template lang="pug">
content-outlet(title='Icons')
  .content-unit
    h4.unit-name Icon classes

    .unit-description css class names for the icons used in the app
</template>

<script>
import ContentOutlet from './ContentOutlet.vue'

export default {
  name: 'ChelIcons',
  components: {
    ContentOutlet
  }
}
</script>

<style lang="scss" scoped>
@import "@assets/style/_variables.scss";
</style>
