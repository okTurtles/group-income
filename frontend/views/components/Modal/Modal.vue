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
  mounted () {
    const modal = this.$route.query.modal
    if (modal) this.openModal(modal)
  },
  beforeDestroy () {
    sbp('okTurtles.events/off', LOAD_MODAL, this.openModal)
    sbp('okTurtles.events/off', CLOSE_MODAL, this.closeModal)
  },
  watch: {
    '$route' (to, from) {
      if (from.query.modal && !to.query.modal) {
        sbp('okTurtles.events/emit', CLOSE_MODAL)
      }
    }
  },
  methods: {
    openModal (componentName) {
      this.content = componentName
      sbp('okTurtles.events/emit', OPEN_MODAL)
      this.$router.push({ query: { modal: componentName } })
    },
    closeModal () {
      // Avoid event problem
      this.content = null
    }
  }
}
</script>
