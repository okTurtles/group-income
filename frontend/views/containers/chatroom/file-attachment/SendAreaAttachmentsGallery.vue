<template lang='pug'>
  .c-send-area-attachments-container
    .c-send-area-attachments-wrapper(
      ref='scrollContainer'
      @scroll='config.debouncedButtonVisibilityCheck'
    )
      slot

    button.is-icon.c-scroll-btn.is-left(
      :class='{ "is-visible": ephemeral.buttonsVisible.left }'
      type='button'
      :aria-label='L("Scroll left")'
      @click.stop='scrollByButton("left")'
    )
      i.icon-chevron-left

    button.is-icon.c-scroll-btn.is-right(
      :class='{ "is-visible": ephemeral.buttonsVisible.right }'
      type='button'
      :aria-label='L("Scroll right")'
      @click.stop='scrollByButton("right")'
    )
      i.icon-chevron-right
</template>

<script>
import { debounce } from 'turtledash'

export default {
  name: 'SendAreaAttachmentsContainer',
  data () {
    return {
      ephemeral: {
        buttonsVisible: {
          left: false,
          right: false
        }
      },
      config: {
        debouncedButtonVisibilityCheck: debounce(this.determineButtonVisibility, 100)
      }
    }
  },
  methods: {
    determineButtonVisibility () {
      const { scrollWidth, clientWidth, scrollLeft } = this.$refs.scrollContainer
      const maxScrollLeft = scrollWidth - clientWidth

      // 1. Left button
      this.ephemeral.buttonsVisible.left = scrollLeft > 10

      // 2. Right button
      this.ephemeral.buttonsVisible.right = scrollLeft + 10 < maxScrollLeft
    },
    scrollByButton (direction = 'right') {
      const { clientWidth } = this.$refs.scrollContainer
      const scrollAmount = clientWidth * 0.6

      this.$refs.scrollContainer.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth'
      })
    }
  },
  updated () {
    this.config.debouncedButtonVisibilityCheck()
  },
  mounted () {
    this.determineButtonVisibility()
    window.addEventListener('resize', this.config.debouncedButtonVisibilityCheck)
  },
  beforeDestroy () {
    window.removeEventListener('resize', this.config.debouncedButtonVisibilityCheck)
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
  opacity: 0;
  pointer-events: none;
  transition: opacity $transitionSpeed ease;

  &.is-visible {
    opacity: 1;
    pointer-events: auto;
  }

  &.is-left {
    left: -1rem;
  }

  &.is-right {
    right: -1rem;
  }
}
</style>
