<template lang="pug">
content-outlet(title='Lists & Tables')
  .content-unit
    h4.unit-name Lists

    .unit-description list UI elements used in the app
</template>

<script>
import ContentOutlet from './ContentOutlet.vue'

export default {
  name: 'ChelListsTables',
  components: {
    ContentOutlet
  }
}
</script>

<style lang="scss" scoped>
@import "@assets/style/_variables.scss";
</style>
