<template>
  <div class="modal is-active" data-test="modal" v-if="isActive" role='dialog'>
    <div class="modal-background" @click="closeModal"></div>

    <div class="modal-card" ref="card">
      <button class="delete" aria-label="close" @click="closeModal"></button>

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
    window.addEventListener('keyup', this.handleKeyUp)
    this.isActive = true
    sbp('okTurtles.events/on', OPEN_MODAL, this.openModal)
    sbp('okTurtles.events/on', CLOSE_MODAL, this.closeModal)
  },
  beforeDestroy () {
    sbp('okTurtles.events/off', OPEN_MODAL, this.openModal)
    sbp('okTurtles.events/off', CLOSE_MODAL, this.closeModal)
    window.removeEventListener('keyup', this.handleKeyUp)
  },
  methods: {
    handleKeyUp (event) {
      if (event.key === 'Escape' && this.isActive) {
        this.closeModal()
      }
    },
    openModal () {
      this.isActive = true
    },
    closeModal () {
      this.isActive = false
      this.$emit('close')
    }
  }
}
</script>
