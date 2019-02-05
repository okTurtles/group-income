<template>
  <modal-basic :isActive="isActive" @close="closeModal">
    <component :is="content"></component>
  </modal-basic>
</template>
<script>
import Vue from 'vue'
import ModalBasic from './ModalBasic.vue'
import sbp from '../../../../shared/sbp.js'
import { OPEN_MODAL, CLOSE_MODAL } from '../../../utils/events.js'

export default {
  name: 'ModalDynamic',
  components: {
    ModalBasic
  },
  data () {
    return {
      content: null,
      isActive: null
    }
  },
  created () {
    sbp('okTurtles.events/on', OPEN_MODAL, component => this.openModal(component))
    sbp('okTurtles.events/on', CLOSE_MODAL, this.closeModal)
  },
  methods: {
    openModal (component) {
      const componentName = component.name ? component : component.name
      const subFolder = component.subFolder ? `${component.subFolder}/` : ''
      const path = `../../containers/${subFolder}${componentName}.vue/`
      console.log(`Trying to load ${componentName} (${path})`)
      Vue.component(componentName, () => import(path))
      this.content = componentName
      this.isActive = true
    },
    closeModal () {
      this.isActive = false
    }
  }
}
</script>
