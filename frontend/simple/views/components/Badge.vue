<template>
  <span class="c-badge has-text-weight-normal" v-if="number">{{number}}</span>
</template>
<style lang="scss" scoped>
@import "../../assets/sass/theme/index";

.c-badge {
  display: inline-block;
  padding: 1px 5px; // a rounded square
  color: $body-background-color;
  line-height: 1.1;
  border-radius: $radius;
  background-color: $danger;
}
</style>
<script>
export default {
  name: 'Badge',
  props: {
    number: Number
  }
}
</script>
