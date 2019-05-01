<template lang='pug'>
  div
    component(:is='content')
    component(:is='subcontent[subcontent.length-1]')
</template>
<script>
import sbp from '~/shared/sbp.js'
import { OPEN_MODAL, LOAD_MODAL, UNLOAD_MODAL, CLOSE_MODAL } from '@utils/events.js'

export default {
  name: 'Modal',
  data () {
    return {
      content: null,
      subcontent: []
    }
  },
  created () {
    sbp('okTurtles.events/on', LOAD_MODAL, component => this.openModal(component))
    sbp('okTurtles.events/on', UNLOAD_MODAL, component => this.closeModal(component))
  },
  mounted () {
    const modal = this.$route.query.modal
    if (modal) this.openModal(modal)
  },
  beforeDestroy () {
    sbp('okTurtles.events/off', LOAD_MODAL, this.openModal)
    sbp('okTurtles.events/off', UNLOAD_MODAL, this.closeModal)
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
      if (this.content) {
        this.subcontent.push(componentName)
        sbp('okTurtles.events/emit', OPEN_MODAL)
      } else {
        this.content = componentName
        sbp('okTurtles.events/emit', OPEN_MODAL)
      }
      this.$router.push({ query: { modal: this.content, subcontent: this.subcontent[this.subcontent.length - 1] } })
    },
    closeModal () {
      let query = {}
      if (this.subcontent.length) {
        this.subcontent.pop()
        query = {
          subcontent: this.subcontent[this.subcontent.length - 1],
          modal: this.content
        }
      } else {
        this.content = undefined
      }
      // Avoid event problem by removing completly the component
      this.$router.push({ query: query })
    }
  }
}
</script>
