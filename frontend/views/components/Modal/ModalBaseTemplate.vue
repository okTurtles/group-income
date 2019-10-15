<template lang='pug'>
  transition(name='zoom' appear @after-leave='unload')
    .modal(
      data-test='modal'
      role='dialog'
      aria-modal='true'
      tabindex='-1'
      @keyup.tab='testFocus'
      v-if='isActive'
    )
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
@import "../../../assets/style/_variables.scss";

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

.modal .c-modal-close {
  background-color: $background;
}

.has-background .c-modal-close {
  background-color: $general_1;
  @include tablet {
    background-color: $background;
  }
}
</style>
