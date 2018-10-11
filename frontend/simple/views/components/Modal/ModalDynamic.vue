<template>
  <modal-basic :isActive="ephemeral.isActive" @close="closeModal">
    <component :is="ephemeral.activeModal"></component>
  </modal-basic>
</template>
<script>
import ModalBasic from './ModalBasic.vue'
import sbp from '../../../../../shared/sbp.js'
import { OPEN_MODAL, CLOSE_MODAL } from '../../../utils/events.js'

export default {
  name: 'ModalDynamic',
  components: {
    ModalBasic
  },
  data () {
    return {
      ephemeral: {
        activeModal: null,
        isActive: null
      }
    }
  },
  created () {
    sbp('okTurtles.events/on', OPEN_MODAL, component => this.openModal(component))
    sbp('okTurtles.events/on', CLOSE_MODAL, this.closeModal)
  },
  methods: {
    openModal (component) {
      this.ephemeral.activeModal = component
      this.ephemeral.isActive = true
    },
    closeModal () {
      this.ephemeral.isActive = false
    }
  }
}
</script>
