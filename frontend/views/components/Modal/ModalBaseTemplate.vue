<template lang='pug'>
  transition(name='zoom')
    .modal.is-active(data-test='modal' v-if='isActive' role='dialog')
      modal-close(@close='close')
      slot
</template>

<script>
import modalMixins from './ModalMixins.js'

export default {
  name: 'ModalTemplate',
  mixins: [modalMixins]
}
</script>

<style lang='scss' scoped>
.modal {
  display: none;
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 9998;
  background: var(--primary);
  overflow: auto;

  &.is-active {
    display: flex;
  }
}

.modal-body {
  height: 100%;
}
</style>
