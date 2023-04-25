<template lang="pug">
content-outlet(title='Buttons')
  .content-unit
    h4.unit-name Primary buttons

    .unit-description description of the UI component in this section.
</template>

<script>
import ContentOutlet from './ContentOutlet.vue'

export default {
  name: 'ChelButtons',
  components: {
    ContentOutlet
  }
}
</script>

<style lang="scss" scoped>
@import "@assets/style/_variables.scss";
</style>
