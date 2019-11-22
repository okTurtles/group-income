<template lang='pug'>
  button.c-modal-close(
    :class='{ "back-on-mobile": backOnMobile }'
    @click.self='$emit("close")'
    :aria-label='L("close modal")'
    data-test='closeModal'
  )
    i.icon-chevron-left(aria-hidden='true')
</template>

<script>
export default {
  name: 'ModalClose',

  props: {
    backOnMobile: {
      type: Boolean,
      default: false
    }
  }
}
</script>

<style lang="scss" scoped>
@import "@assets/style/_variables.scss";

.c-modal-close {
  position: fixed;
  right: $spacer;
  top: $spacer;
  z-index: 4;
  height: 2.75rem;
  width: 2.75rem;
  border: none;
  border-radius: 50%;
  padding: 0;
  -moz-appearance: none;
  -webkit-appearance: none;
  cursor: pointer;
  background-color: $general_1;

  i {
    display: none;
  }

  @include tablet {
    top: 1.5rem;
    right: 1.5rem;
  }

  @include desktop {
    position: absolute;
    top: $spacer;
    right: $spacer;
  }

  &::before,
  &::after {
    background-color: $text_0;
    content: "";
    display: block;
    position: absolute;
    left: 50%;
    top: 50%;
    width: 12px;
    height: 2px;
    transition: transform 0.15s ease-in;
    transform: translateX(-50%) translateY(-50%) rotate(45deg);
    transform-origin: center center;
  }

  &::after {
    transform: translateX(-50%) translateY(-50%) rotate(-45deg);
  }

  &:focus {
    outline: none;
  }

  &:focus,
  &:hover {
    &::before {
      transform: translateX(-50%) translateY(-50%) rotate(0);
    }

    &::after {
      transform: translateX(-50%) translateY(-50%) rotate(0);
    }
  }

  &.back-on-mobile {
    @include until($tablet) {
      position: relative;
      left: 0;
      top: 0;
      margin-right: $spacer;

      i {
        display: block;
        color: $text_0;
        margin-left: 0;
      }

      &::before,
      &::after {
        content: none;
      }
    }
  }
}
</style>
