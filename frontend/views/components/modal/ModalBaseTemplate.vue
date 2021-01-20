<template lang='pug'>
  transition(name='zoom' appear @after-leave='unload')
    .modal(
      v-if='modalIsActive'
      :class='{ fullscreen }'
      role='dialog'
      tabindex='-1'
      :aria-label='a11yTitle'
      v-focus='autofocus'
      data-test='modal'
      @close='close'
    )
      modal-close(@close='close' :fullscreen='fullscreen')
      slot
</template>

<script>
import modalMixins from './ModalMixins.js'
import trapFocus from '@utils/trapFocus.js'

export default {
  name: 'ModalBaseTemplate',
  mixins: [modalMixins, trapFocus],
  props: {
    fullscreen: {
      type: Boolean,
      default: true
    },
    autofocus: {
      type: Boolean,
      default: true
    }
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
    padding: 0 1rem;

    @include tablet {
      padding: 0 1.5rem;
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
  top: 0.75rem;

  @include tablet {
    top: 1.5rem
  }

  @include desktop {
    background-color: $background;
  }
}
</style>
