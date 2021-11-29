<template lang='pug'>
  .settings-container
    .card
      p TODO
</template>

<script>
export default ({
  name: 'PlaceHolder'
}: Object)
</script>

<style lang='scss' scoped>
@import "@assets/style/_variables.scss";

.settings-container {
  @include desktop {
    padding-top: 1.5rem;
  }
}
</style>
