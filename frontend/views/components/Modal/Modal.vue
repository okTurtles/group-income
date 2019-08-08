<template lang='pug'>
  div
    component(:is='content')
    component(:is='subcontent[subcontent.length-1]')
</template>
<script>
import sbp from '~/shared/sbp.js'
import { OPEN_MODAL, LOAD_MODAL, UNLOAD_MODAL, REPLACE_MODAL, CLOSE_MODAL } from '@utils/events.js'

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
    sbp('okTurtles.events/on', LOAD_MODAL, component => this.openModal(component))
    sbp('okTurtles.events/on', UNLOAD_MODAL, component => this.closeModal(component))
    sbp('okTurtles.events/on', REPLACE_MODAL, component => this.replaceModal(component))
  },
  mounted () {
    const modal = this.$route.query.modal
    if (modal) this.openModal(modal)
  },
  beforeDestroy () {
    sbp('okTurtles.events/off', LOAD_MODAL, this.openModal)
    sbp('okTurtles.events/off', UNLOAD_MODAL, this.closeModal)
    sbp('okTurtles.events/off', REPLACE_MODAL, this.replaceModal)
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
        // QUESTION: Why emmiting this event if
        // there is not any events/on' poiting to OPEN_MODAL?
        sbp('okTurtles.events/emit', OPEN_MODAL)
      } else {
        this.content = componentName
        // QUESTION: Same here..
        sbp('okTurtles.events/emit', OPEN_MODAL)
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
      const query = this.$route.query || {}

      if (this.subcontent.length) {
        this.subcontent.pop()
        query.subcontent = this.subcontent[this.subcontent.length - 1]
        query.modal = this.content
      } else {
        this.content = undefined
      }

      // BUG: This isn't working at all but if you pause the dev
      // tools and do it manually on the console it works :/
      // Avoid event problem by removing completly the component
      this.$router.push({ query: query })
    }
  }
}
</script>
