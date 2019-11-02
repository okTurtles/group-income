<template lang='pug'>
  .settings-container
    .card
      p
        | Implement
        strong "{{name}}"
        |  settings page
</template>

<script>
export default {
  name: 'PlaceHolder',

  props: {
    name: String
  }
}
</script>

<style lang='scss' scoped>
@import "@assets/style/_variables.scss";

.settings-container {
  @include tablet {
    padding-top: 1.5rem;
  }
}
</style>
