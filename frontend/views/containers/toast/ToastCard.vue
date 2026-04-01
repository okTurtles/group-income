<template lang='pug'>
.c-toast-card
  | TODO!
</template>

<script>
export default {
  name: 'ToastCard',
  props: {
    data: Object
  }
}
</script>

<style lang='scss' scoped>
@import "@assets/style/_variables.scss";

.c-toast-card {
  position: relative;
  display: flex;
  align-items: flex-start;
  padding: 1rem;
  border-radius: $radius;
  column-gap: 0.5rem;
}
</style>
