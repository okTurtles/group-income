<template lang='pug'>
  button.modal-close(@click.self="$emit('close')")
</template>

<script>
export default {
  name: 'ModalClose'
}
</script>

<style lang="scss" scoped>
@import "../../../assets/sass/theme/index";

.modal-close {
  position: absolute;
  z-index: 1;
  right: 1rem;
  height: 40px;
  width: 40px;
  border: none;
  border-radius: 50%;
  @extend %unselectable;
  -moz-appearance: none;
  -webkit-appearance: none;
  cursor: pointer;
  background-color: #f1f1f1;

  @include tablet {
    top: 24px;
    right: 24px;
  }

  @include desktop {
    top: 1rem;
    right: 1rem;
  }

  &::before,
  &::after {
    background-color: #363636;
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
