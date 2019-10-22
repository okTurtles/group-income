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
      replacement: null, // This let us replace the modal once the first one is close without updating the url
      lastFocus: null // Record element that open the modal
    }
  },
  created () {
    sbp('okTurtles.events/on', OPEN_MODAL, this.openModal)
    sbp('okTurtles.events/on', CLOSE_MODAL, this.unloadModal)
    sbp('okTurtles.events/on', REPLACE_MODAL, this.replaceModal)
    // When press escape it should close the modal
    window.addEventListener('keyup', this.handleKeyUp)
  },
  mounted () {
    this.initializeModals()
    console.log('- content: ', this.content)
    console.log('- subcontent: ', this.subcontent)
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
          if (i !== -1) {
            this.subcontent = this.subcontent.slice(0, i)
          } else this.subcontent = subcontent
        }
      } else {
        // When the route change we compare to see if the modal changed
        // If so, we send the event to close the modal
        if (from.query.modal) {
          this.unloadModal()
        }
      }
    }
  },
  methods: {
    handleKeyUp (e) {
      // Only if there an active modal
      if (this.content && e.key === 'Escape') {
        e.preventDefault()
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
        this.$router.push({
          query: {
            ...this.$route.query,
            ...{ modal: this.content, subcontent: this.activeSubcontent() }
          }
        }).catch(console.error)
      } else if (this.$route.query.modal) {
        const query = { ...this.$route.query }
        delete query['modal']
        delete query['subcontent']
        this.$router.push({ query }).catch(console.error)
      }
    },
    openModal (componentName) {
      // Don't open the same kind of modal twice.
      if (this.content === componentName) return
      // Record active element
      this.lastFocus = document.activeElement
      if (this.content) {
        this.subcontent.push(componentName)
      } else {
        this.content = componentName
      }
      this.updateUrl()
    },
    unloadModal () {
      if (this.subcontent.length) {
        this.subcontent.pop()
      } else {
        this.content = null
        // Refocus on button that open the modal
        this.lastFocus.focus()
      }
      if (this.replacement) {
        this.openModal(this.replacement)
        this.replacement = null
      } else {
        this.updateUrl()
      }
    },
    replaceModal (componentName) {
      this.replacement = componentName
      // At the moment you can only replace a modal if it's the main one by design
      // Use direct children instead of sbp to wait for animation out
      this.$refs['content'].$children[0].close()
    }
  }
}
</script>
