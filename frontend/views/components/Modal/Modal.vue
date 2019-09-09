<template lang='pug'>
  div
    component(:is='content')
    component(:is='subcontent[subcontent.length-1]')
</template>
<script>
import sbp from '~/shared/sbp.js'
import { OPEN_MODAL, REPLACE_MODAL, CLOSE_MODAL } from '@utils/events.js'

export default {
  name: 'Modal',
  data () {
    return {
      // QUESTION: What's the dif between content and subcontent?
      // What are the use cases of it?
      content: null,
      subcontent: []
    }
  },
  created () {
    sbp('okTurtles.events/on', OPEN_MODAL, component => this.openModal(component))
    sbp('okTurtles.events/on', CLOSE_MODAL, component => this.closeModal(component))
    sbp('okTurtles.events/on', REPLACE_MODAL, component => this.replaceModal(component))
  },
  mounted () {
    const modal = this.$route.query.modal
    if (modal) this.openModal(modal)
  },
  beforeDestroy () {
    sbp('okTurtles.events/off', OPEN_MODAL, this.openModal)
    sbp('okTurtles.events/off', CLOSE_MODAL, this.closeModal)
    sbp('okTurtles.events/off', REPLACE_MODAL, this.replaceModal)
  },
  watch: {
    '$route' (to, from) {
      // When the route change we compare to see if the modal changed
      // If so, we send the event to close the modal
      if (from.query.modal && !to.query.modal) {
        sbp('okTurtles.events/emit', CLOSE_MODAL)
      }
    }
  },
  methods: {
    openModal (componentName) {
      if (this.content) {
        this.subcontent.push(componentName)
      } else {
        this.content = componentName
      }
      this.$router.push({ query: { modal: this.content, subcontent: this.subcontent[this.subcontent.length - 1] } })
    },
    replaceModal (componentName) {
      this.closeModal()
      setTimeout(() => {
        this.openModal(componentName)
      }, 300)
    },
    closeModal () {
      if (this.subcontent.length) {
        this.$router.go(-1)
        setTimeout(() => {
          this.subcontent.pop()
        }, 300)
      } else {
        this.content = null
        this.$router.push({})
      }
    }
  }
}
</script>
