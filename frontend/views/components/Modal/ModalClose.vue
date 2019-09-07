<template lang='pug'>
  button.c-modal-close(
    @click.self="$emit('close')"
    aria-label='close'
  )
</template>

<script>
export default {
  name: 'ModalClose'
}
</script>

<style lang="scss" scoped>
@import "../../../assets/style/_variables.scss";

.c-modal-close {
  position: absolute;
  right: 1rem;
  top: 1.375rem;
  z-index: 4;
  height: 32px;
  min-height: 32px;
  width: 32px;
  border: none;
  border-radius: 50%;
  padding: 0;
  @extend %unselectable;
  -moz-appearance: none;
  -webkit-appearance: none;
  cursor: pointer;
  background-color: $general_1;

  @include tablet {
    background-color: $background;
    top: 24px;
    right: 24px;
    height: 40px;
    width: 40px;
  }

  @include desktop {
    top: 1rem;
    right: 1rem;
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
}
</style>
