<template lang='pug'>
  .c-send-area-attachments-container(ref='galleryContainer')
    .c-send-area-attachments-wrapper
      slot

    button.is-icon.c-scroll-btn.is-left(
      type='button'
      :aria-label='L("Scroll left")'
      @click.stop='scrollLeft'
    )
      i.icon-chevron-left

    button.is-icon.c-scroll-btn.is-right(
      type='button'
      :aria-label='L("Scroll right")'
      @click.stop='scrollRight'
    )
      i.icon-chevron-right
</template>

<script>
export default {
  name: 'SendAreaAttachmentsContainer',
  methods: {
    determineButtonVisibility () {
      console.log('TODO')
    },
    scrollLeft () {
      console.log('TODO')
    },
    scrollRight () {
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
  display: block;
}

.c-send-area-attachments-wrapper {
  position: relative;
  width: 100%;
  display: flex;
  flex-wrap: nowrap;
  align-items: center;
  column-gap: 1rem;
  overflow-x: auto;
  padding: 0.75rem 0 0.5rem;
  @include overflow-touch;
  @include hide-scrollbar;
}

button.c-scroll-btn {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  background-color: $general_2;
  color: $text_0;
  border: 1px solid $general_0;
  box-shadow: 0 0 4px rgba(29, 28, 29, 0.13);
  width: 2rem;
  height: 2rem;
  font-size: $size_4;
  border-radius: 50%;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  line-height: 1;
  z-index: 2;

  &.is-left {
    left: -1rem;
  }

  &.is-right {
    right: -1rem;
  }
}
</style>
