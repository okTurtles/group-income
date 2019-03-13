<template>
  <div class="modal is-active" data-test="modal" v-if="isActive" role='dialog' @keyup.esc="close">
    <div class="modal-background" @click="close"></div>

    <div class="modal-card" ref="card">
      <button class="delete" @click.self="close"></button>

      <header class="modal-card-head has-text-centered" v-if="$scopedSlots.title || $scopedSlots.subTitle">
        <h1 class="modal-card-title title is-size-5 is-marginless has-text-text-light"  v-if="$scopedSlots.title">
          <slot name="title"></slot>
        </h1>

        <h2 class="title is-size-3" v-if="$scopedSlots.subTitle">
          <slot name="subTitle" ></slot>
        </h2>
      </header>

      <section class="modal-card-body">
        <slot></slot>
      </section>

      <footer class="modal-card-foot" v-if="$scopedSlots.buttons || $scopedSlots.footer || $scopedSlots.errors">
        <div class="buttons" v-if="$scopedSlots.buttons">
          <slot name="buttons"></slot>
        </div>

        <p class="has-text-danger" data-test="submitError" v-if="$scopedSlots.errors" >
          <slot name="errors"></slot>
        </p>

        <slot name="footer"></slot>
      </footer>
    </div>
  </div>
</template>

<script>
import sbp from '../../../../shared/sbp.js'
import { OPEN_MODAL, CLOSE_MODAL } from '../../../utils/events.js'

export default {
  name: 'Modal',
  data () {
    return {
      isActive: false
    }
  },
  mounted () {
    this.isActive = true
    sbp('okTurtles.events/on', OPEN_MODAL, this.openModal)
    sbp('okTurtles.events/on', CLOSE_MODAL, this.closeModal)
  },
  beforeDestroy () {
    sbp('okTurtles.events/off', OPEN_MODAL, this.openModal)
    sbp('okTurtles.events/off', CLOSE_MODAL, this.closeModal)
  },
  methods: {
    close (e) {
      // To remove when @keyup.esc Vue bug is fixed
      const isEscapeKey = e.key === 'Escape'
      // Fix the bug where keyboard event trigger click type event
      const isCloseButtonClick = e.type === 'click' && e.screenX !== 0
      if (isEscapeKey || isCloseButtonClick) {
        sbp('okTurtles.events/emit', 'close-modal')
      }
    },
    openModal () {
      this.isActive = true
    },
    closeModal () {
      this.isActive = false
    }
  }
}
</script>
