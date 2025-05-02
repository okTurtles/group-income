<template lang="pug">
content-outlet(title='Typography')
  .content-unit
    h4.unit-name Typography

    .unit-description
      | Explains about the typography used in the app

    .c-dropdowns-container dropdowns...
</template>

<script>
import ContentOutlet from './ContentOutlet.vue'

export default {
  name: 'ChelForms',
  components: {
    ContentOutlet
  }
}
</script>

<style lang="scss" scoped>
@import "@assets/style/_variables.scss";
</style>
