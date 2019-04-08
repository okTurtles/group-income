<template>
  <component :is="content"></component>
</template>
<script>
import sbp from '../../../../shared/sbp.js'
import { mapGetters } from 'vuex'
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
    if (this.modal) {
      this.openModal(this.modal)
    }
  },
  beforeDestroy () {
    sbp('okTurtles.events/off', LOAD_MODAL, this.openModal)
    sbp('okTurtles.events/off', CLOSE_MODAL, this.closeModal)
  },
  computed: {
    ...mapGetters([
      'modal'
    ])
  },
  watch: {
    '$route' (to, from) {
      if (from.query.modal) {
        this.$store.dispatch('setModal', false)
        sbp('okTurtles.events/emit', CLOSE_MODAL)
      }
    }
  },
  methods: {
    openModal (componentName) {
      this.content = componentName
      sbp('okTurtles.events/emit', OPEN_MODAL)
      this.$router.push({ query: { modal: componentName } })
      this.$store.dispatch('setModal', componentName)
    },
    closeModal () {
      // Avoid event problem
      this.content = null
    }
  }
}
</script>
