<template lang='pug'>
  .c-send-area-attachments-container(ref='galleryContainer')
    slot
</template>

<script>
export default {
  name: 'SendAreaAttachmentsContainer',
  methods: {
    determineButtonVisibility () {
      console.log('TODO')
    },
    onLeftClick () {
      console.log('TODO')
    },
    onRightClick () {
      console.log('TODO')
    }
  }
}
</script>

<style lang='scss' scoped>
@import "@assets/style/_variables.scss";

.c-send-area-attachments-container {
  position: relative;
  width: 100%;
  display: flex;
  flex-wrap: nowrap;
  align-items: center;
  column-gap: 1rem;
  overflow-x: auto;
  padding: 0.75rem 0 0.5rem;
  scroll-behavior: smooth;
  @include overflow-touch;
  @include hide-scrollbar;
}
</style>
