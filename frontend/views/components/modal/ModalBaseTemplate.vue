<template lang='pug'>
  transition(name='zoom' appear @after-leave='unload')
    .modal(
      :class='{ fullscreen }'
      data-test='modal'
      role='dialog'
      tabindex='-1'
      @keyup.tab='trapFocus'
      v-if='modalIsActive'
      @close='close'
    )
      modal-close(@close='close' :fullscreen='fullscreen')
      slot
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

  &.fullscreen {
    flex-direction: column;
    justify-content: flex-start;
    align-items: center;
    background: $general_2;
    padding: 0 $spacer;

    @include tablet {
      padding: 0 $spacer*1.5;
    }
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
