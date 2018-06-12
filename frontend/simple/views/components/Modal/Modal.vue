<template>
  <article class="modal is-active"
    v-if="isActive"
  >
    <div class="modal-background" @click="handleCloseClick"></div>
    <div class="modal-card">
      <button class="delete" aria-label="close" @click="handleCloseClick"></button>
      <component :is="activeModal"></component>
    </div>
  </article>
</template>
<script>
import sbp from '../../../../../shared/sbp.js'
import { OPEN_MODAL } from '../../../utils/events.js'

export default {
  name: 'ModalForm',
  data () {
    return {
      isActive: false,
      activeModal: null
    }
  },
  created () {
    sbp('okTurtles.events/on', OPEN_MODAL, ({ data }) => this.setModal(data))
  },
  methods: {
    setModal (component) {
      this.activeModal = component
      this.isActive = true
    },
    handleCloseClick () {
      this.isActive = false
    }
  }
}
</script>
