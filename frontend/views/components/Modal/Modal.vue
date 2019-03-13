<template>
  <component :is="content"></component>
</template>
<script>
import sbp from '../../../../shared/sbp.js'
import { OPEN_MODAL, LOAD_MODAL, CLOSE_MODAL } from '../../../utils/events.js'

export default {
  name: 'Modal',
  data () {
    return {
      content: null
    }
  },
  created () {
    sbp('okTurtles.events/on', LOAD_MODAL, component => this.openModal(component))
    sbp('okTurtles.events/on', CLOSE_MODAL, component => this.closeModal(component))
  },
  beforeDestroy () {
    sbp('okTurtles.events/off', LOAD_MODAL, this.openModal)
    sbp('okTurtles.events/off', CLOSE_MODAL, this.closeModal)
  },
  methods: {
    openModal (componentName) {
      this.content = componentName
      sbp('okTurtles.events/emit', OPEN_MODAL)
    },
    closeModal () {
      // Avoid event problem
      this.content = null
    }
  }
}
</script>
