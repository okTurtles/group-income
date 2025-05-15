<template lang='pug'>
.c-modal-simple(role='dialog')
  transition(name='fade' appear)
    .c-modal-simple-background(v-if='isActive' @click='close()')

  transition(name='zoom' appear)
    .c-modal-simple-content(v-if='isActive')
      button.is-icon.c-close-btn(v-if='!hideCloseButton' @click='close()')
        i.icon-close

      section.c-modal-simple-body
        slot
</template>

<script>
import sbp from '@sbp/sbp'
import { CLOSE_MODAL, CLOSE_PROMPT, PROMPT_RESPONSE } from '@view-utils/events.js'
import { PROMPT_ACTIONS } from '@view-utils/constants.js'

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
    },
    variant: {
      type: String,
      validator: v => ['prompt', 'modal'].includes(v),
      default: 'modal'
    }
  },
  methods: {
    close (cb = null) {
      if (!this.isActive) { return }

      this.isActive = false
      setTimeout(() => {
        if (cb) { return cb() }

        switch (this.variant) {
          case 'modal':
            sbp('okTurtles.events/emit', CLOSE_MODAL)
            break
          case 'prompt':
            sbp('okTurtles.events/emit', PROMPT_RESPONSE, PROMPT_ACTIONS.CLOSE)
            sbp('okTurtles.events/emit', CLOSE_PROMPT)
        }
      }, 300)
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
    padding: 1.2rem 2rem;
    width: 38rem;
    max-width: calc(100vw - 2rem);
    height: auto;
    max-height: calc(100% - 4rem);
    overflow: hidden;
    background: var(--modal-bg-color);
    border-radius: 0.375rem;

    @include tablet {
      padding: 2rem 3.2rem;
    }

    @include desktop {
      max-width: 46rem;
    }
  }

  &-header {
    position: relative;
    display: flex;
  }
}

.c-close-btn {
  position: absolute;
  right: 0.75rem;
  top: 0.75rem;
  width: 1.75rem;
  height: 1.75rem;
  border-radius: 50%;
  z-index: 1;
  background: var(--modal-bg-color);

  i {
    display: inline-block;
    line-height: 1;
    transform: translate(1px, 1px);
    font-size: 1rem;
  }

  @include tablet {
    right: 1rem;
    top: 1rem;
    width: 2rem;
    height: 2rem;

    i {
      font-size: 1.125rem;
    }
  }
}
</style>
