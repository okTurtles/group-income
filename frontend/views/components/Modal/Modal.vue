<template>
  <component :is="content"></component>
</template>
<script>
import sbp from '../../../../shared/sbp.js'
import { OPEN_MODAL, LOAD_MODAL } from '../../../utils/events.js'

export default {
  name: 'Modal',
  data () {
    return {
      content: null
    }
  },
  created () {
    sbp('okTurtles.events/on', LOAD_MODAL, component => this.openModal(component))
  },
  methods: {
    openModal (componentName) {
      this.content = componentName
      sbp('okTurtles.events/emit', OPEN_MODAL)
    }
  }
}
</script>
