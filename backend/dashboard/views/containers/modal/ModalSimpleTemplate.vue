<template lang='pug'>
.c-modal-simple(role='dialog')
  transition(name='fade' appear)
    .c-modal-simple-background(v-if='isActive' @click='close')

  transition(name='zoom' appear)
    .c-modal-simple-content(v-if='isActive')
      button.is-icon.c-close-btn(@click='close')
        i.icon-close

      section.c-modal-simple-body
        slot
</template>

<script>
import sbp from '@sbp/sbp'
import { CLOSE_MODAL } from '@view-utils/events.js'

export default {
  name: 'ModalSimpleTemplate',
  data () {
    return {
      isActive: true
    }
  },
  props: {
    hideCloseButton: {
      type: Boolean,
      default: false
    }
  },
  methods: {
    close () {
      if (!this.isActive) { return }

      this.isActive = false
      setTimeout(() => sbp('okTurtles.events/emit', CLOSE_MODAL), 300)
    }
  }
}
</script>

<style style lang='scss' scoped>
@import "@assets/style/_variables.scss";

.c-modal-simple {
  display: flex;
  position: fixed;
  z-index: $zindex-modal;
  left: 0;
  right: 0;
  top: 0;
  bottom: 0;
  justify-content: center;
  align-items: center;
  max-width: 100vw;
  overflow: hidden;

  &-background {
    position: fixed;
    display: block;
    top: 0;
    bottom: 0;
    left: 0;
    right: 0;
    background-color: rgba(10, 10, 10, 0.86);
  }

  &-content {
    position: relative;
    display: block;
    padding: 1.6rem 2rem;
    width: 46rem;
    max-width: calc(100vw - 4rem);
    height: auto;
    max-height: calc(100% - 4rem);
    overflow: hidden;
    background: var(--modal-bg-color);
    border-radius: 0.375rem;

    @include tablet {
      padding: 2.4rem 3.2rem;
    }
  }

  &-header {
    position: relative;
    display: flex;
  }
}

.c-close-btn {
  position: absolute;
  right: 1.25rem;
  top: 1.25rem;
  width: 2.25rem;
  height: 2.25rem;
  border-radius: 50%;
  z-index: 1;
  background: var(--modal-bg-color);

  i {
    display: inline-block;
    line-height: 1;
    transform: translate(1px, 1px);
  }
}
</style>
