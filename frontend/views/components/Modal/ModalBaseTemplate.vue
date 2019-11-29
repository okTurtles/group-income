<template lang='pug'>
  transition(name='zoom' appear @after-leave='unload')
    .modal(
      data-test='modal'
      role='dialog'
      tabindex='-1'
      @keyup.tab='trapFocus'
      v-if='modalIsActive'
      @close='close'
    )
      modal-close(@close='close' :fullscreen='fullscreen')

      .modal-fullscreen(v-if='fullscreen')
        slot
      slot(v-else)
</template>

<script>
import modalMixins from './ModalMixins.js'

export default {
  name: 'ModalBaseTemplate',
  mixins: [modalMixins],
  props: {
    fullscreen: Boolean
  }
}
</script>

<style lang='scss' scoped>
@import "@assets/style/_variables.scss";

.modal {
  display: flex;
  position: fixed;
  z-index: $zindex-modal;
  top: 0;
  left: 0;
  bottom: 0;
  right: 0;
  overflow: auto;
}

.modal-fullscreen {
  height: 100%;
  width: 100%;
  background: $general_2;
  padding: $spacer-lg $spacer;

  @include tablet {
    padding: $spacer*2.5 $spacer*1.5;
  }
}

.modal-body {
  height: 100%;
}

.modal .c-modal-close {
  background-color: $background;
}

.has-background .c-modal-close {
  background-color: $general_1;

  @include desktop {
    background-color: $background;
  }
}
</style>
