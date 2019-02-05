<template>
  <component :is="content"></component>
</template>
<script>
import Vue from 'vue'
import Modal from './Modal.vue'
import sbp from '../../../../shared/sbp.js'
import { OPEN_MODAL, LOAD_MODAL } from '../../../utils/events.js'

// @greg To test:
import LoginModal from '../../containers/LoginModal.vue'

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
      const subFolder = component.subFolder ? `${component.subFolder}/` : ''
      const path = `../../containers/${subFolder}${componentName}.vue`
      console.log(`Trying to load ${componentName} (${path})`)
      Vue.component(componentName, () => import(path))
      // @greg: this is not working
      // this.content = componentName
      this.content = LoginModal
      sbp('okTurtles.events/emit', OPEN_MODAL)
    }
  }
}
</script>
