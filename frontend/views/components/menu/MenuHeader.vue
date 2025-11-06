<template lang='pug'>
.c-header
  slot
</template>

<script>
export default ({
  name: 'MenuHeader'
}: Object)
</script>

<style lang="scss" scoped>
@import "@assets/style/_variables.scss";

.c-header {
  padding: 0.5rem 1rem;
  font-weight: bold;
  text-transform: uppercase;
}
</style>
