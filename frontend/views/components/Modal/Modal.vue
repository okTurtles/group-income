<template lang='pug'>
  div
    component(:is='content' ref='content')
    component(:is='subcontent[subcontent.length-1]')
</template>
<script>
import sbp from '~/shared/sbp.js'
import { OPEN_MODAL, REPLACE_MODAL, CLOSE_MODAL } from '@utils/events.js'

export default {
  name: 'Modal',
  data () {
    return {
      content: null, // This is the main modal
      subcontent: [], // This is for collection of modal on top of modals
      replacement: null
    }
  },
  created () {
    sbp('okTurtles.events/on', OPEN_MODAL, component => this.openModal(component))
    sbp('okTurtles.events/on', CLOSE_MODAL, component => this.unloadModal(component))
    sbp('okTurtles.events/on', REPLACE_MODAL, component => this.replaceModal(component))
    // When press escape it should close the modal
    window.addEventListener('keyup', this.handleKeyUp)
  },
  mounted () {
    this.initializeModals()
  },
  beforeDestroy () {
    sbp('okTurtles.events/off', OPEN_MODAL)
    sbp('okTurtles.events/off', CLOSE_MODAL)
    sbp('okTurtles.events/off', REPLACE_MODAL)
    window.removeEventListener('keyup', this.handleKeyUp)
  },
  watch: {
    '$route' (to, from) {
      if (to.query.modal) {
        // We reset the modals with no animation for simplicity
        if (to.query.modal !== this.content) this.content = to.query.modal
        const subcontent = to.query.subcontent
        if (subcontent !== this.activeSubcontent()) {
          // Try to find the new subcontent in the list of subcontent
          const i = this.subcontent.indexOf(subcontent)
          if (i) {
            this.subcontent = this.subcontent.splice(0, i)
          } else this.subcontent = subcontent
        }
      } else {
        // When the route change we compare to see if the modal changed
        // If so, we send the event to close the modal
        if (from.query.modal) {
          sbp('okTurtles.events/emit', CLOSE_MODAL)
        }
      }
    }
  },
  methods: {
    handleKeyUp (e) {
      // Only if there an active modal
      if (this.content && e.key === 'Escape') {
        this.unloadModal()
      }
    },
    activeSubcontent () {
      return this.subcontent[this.subcontent.length - 1]
    },
    initializeModals () {
      const modal = this.$route.query.modal
      if (modal) this.openModal(modal)
      const subcontent = this.$route.query.subcontent
      if (subcontent) this.openModal(subcontent)
    },
    updateUrl () {
      if (this.content) {
        this.$router.push({ query: { modal: this.content, subcontent: this.activeSubcontent() } }).catch(console.error)
      } else {
        this.$router.push({ query: null }).catch(console.error)
      }
    },
    openModal (componentName) {
      if (this.content) {
        this.subcontent.push(componentName)
      } else {
        this.content = componentName
      }
      this.updateUrl()
    },
    unloadModal (name) {
      if (this.subcontent.length) {
        this.subcontent.pop()
      } else {
        this.content = null
      }
      this.updateUrl()
      if (this.replacement) {
        this.openModal(this.replacement)
        this.replacement = null
      }
    },
    closeModal () {
      // Use direct children instead of sbp to wait for animation out
      this.$refs['content'].$children[0].close()
    },
    replaceModal (componentName) {
      this.replacement = componentName
      this.closeModal()
    }
  }
}
</script>
