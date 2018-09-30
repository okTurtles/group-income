<template>
  <div class="modal is-active"
    data-test="modal"
    v-if="isActive"
  >
    <div class="modal-background" @click="handleCloseClick"></div>
    <div class="modal-card">
      <button class="delete" aria-label="close" @click="handleCloseClick"></button>
      <component :is="activeModal"></component>
    </div>
  </div>
</template>
<script>
import sbp from '../../../../../shared/sbp.js'
import { OPEN_MODAL, CLOSE_MODAL } from '../../../utils/events.js'

export default {
  name: 'ModalForm',
  data () {
    return {
      isActive: false,
      activeModal: null
    }
  },
  mounted () {
    global.addEventListener('keyup', this.handleKeyUp)
  },
  created () {
    sbp('okTurtles.events/on', OPEN_MODAL, component => this.openModal(component))
    sbp('okTurtles.events/on', CLOSE_MODAL, this.closeModal)
  },
  methods: {
    openModal (component) {
      this.activeModal = component
      this.isActive = true
    },
    handleCloseClick () {
      this.closeModal()
    },
    handleKeyUp (event) {
      if (this.isActive && event.keyCode === 27) { // esc key
        this.closeModal()
      }
    },
    closeModal () {
      this.isActive = false
    }
  }
}
</script>
