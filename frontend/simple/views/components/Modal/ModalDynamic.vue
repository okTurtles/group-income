<template>
  <modal :isActive="isActive" @close="closeModal">
    <component :is="activeModal"></component>
  </modal>
</template>
<script>
import Modal from './ModalBasic.vue'
import sbp from '../../../../../shared/sbp.js'
import { OPEN_MODAL, CLOSE_MODAL } from '../../../utils/events.js'

export default {
  name: 'ModalDynamic',
  components: {
    Modal
  },
  data () {
    return {
      isActive: null,
      activeModal: null
    }
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
    closeModal () {
      this.isActive = false
    }
  }
}
</script>
