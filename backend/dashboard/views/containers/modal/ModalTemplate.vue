<template lang='pug'>
.c-modal(
  role='dialog'
  tabindex='-1'
  v-focus=''
)
  transition(name='fade' appear)
    .c-modal-background(v-if='isActive' @click='close')

  transition(name='slide-left' appear @after-leave='onLeaveEnd')
    .c-modal-content(v-if='isActive')
      header.c-modal-header(v-if='$scopedSlots.title')
        h1.is-title-2
          slot(name='title')

      section.c-modal-body
        slot
</template>

<script>
import sbp from '@sbp/sbp'
import { CLOSE_MODAL } from '@view-utils/events.js'

export default {
  name: 'ModalTemplate',
  data () {
    return {
      isActive: true
    }
  },
  methods: {
    close () {
      this.isActive = false
    },
    onLeaveEnd () {
      // let Modal.vue to unload currently active modal
      sbp('okTurtles.events/emit', CLOSE_MODAL)
    }
  }
}
</script>

<style lang='scss' scoped>
@import "@assets/style/_variables.scss";

.c-modal {
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
  overflow: auto;
}

.c-modal-background {
  display: none;

  @include desktop {
    position: fixed;
    display: block;
    top: 0;
    bottom: 0;
    left: 0;
    right: 0;
    background-color: rgba(10, 10, 10, 0.86);
  }
}

.c-modal-content {
  position: absolute;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  width: 100%;
  height: 100%;
  margin: 0 auto;
  background: $background_0;

  @include desktop {
    position: relative;
    border-radius: 0.375rem;
    max-width: 40rem;
    height: auto;
    margin: auto;
  }
}
</style>
