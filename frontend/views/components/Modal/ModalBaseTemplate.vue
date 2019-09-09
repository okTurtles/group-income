<template lang='pug'>
  transition(name='zoom' appear)
    .modal(data-test='modal' role='dialog' v-if='isActive')
      modal-close(@close='close')
      slot
</template>

<script>
import modalMixins from './ModalMixins.js'

export default {
  name: 'ModalBaseTemplate',
  mixins: [modalMixins]
}
</script>

<style lang='scss' scoped>
.modal {
  display: flex;
  position: fixed;
  z-index: 9998;
  top: 0;
  left: 0;
  bottom: 0;
  right: 0;
  overflow: auto;
}

.modal-body {
  height: 100%;
}
</style>
