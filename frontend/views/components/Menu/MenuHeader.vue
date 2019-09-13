<template lang='pug'>
.c-header
  slot
</template>

<script>
export default {
  name: 'MenuHeader'
}
</script>

<style lang="scss" scoped>
@import "../../../assets/style/_variables.scss";

.c-header {
  padding: $spacer-sm $spacer $spacer-sm $spacer;
  font-weight: bold;
  text-transform: uppercase;
}
</style>
