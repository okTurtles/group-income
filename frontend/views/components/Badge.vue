<template lang='pug'>
span.c-badge(v-if='number') {{number}}
</template>

<script>
export default {
  name: 'Badge',
  props: {
    number: Number
  }
}
</script>

<style lang="scss" scoped>
@import "../../assets/style/_variables.scss";

.c-badge {
  display: inline-block;
  padding: 1px 5px; // a rounded square
  color: $background;
  line-height: 1.1;
  border-radius: $radius;
  background-color: $danger_0;
}
</style>
