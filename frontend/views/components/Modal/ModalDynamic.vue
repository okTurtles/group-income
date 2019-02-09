<template>
  <component :is="content"></component>
</template>
<script>
// import Vue from 'vue'
import Modal from './Modal.vue'
import sbp from '../../../../shared/sbp.js'
import { OPEN_MODAL, LOAD_MODAL } from '../../../utils/events.js'

export default {
  name: 'ModalDynamic',
  components: {
    Modal
  },
  data () {
    return {
      content: null
    }
  },
  created () {
    sbp('okTurtles.events/on', LOAD_MODAL, component => this.openModal(component))
  },
  methods: {
    openModal (component) {
      const componentName = component.name ? component.name : component
      this.content = componentName
      sbp('okTurtles.events/emit', OPEN_MODAL)
    }
  }
}
</script>
