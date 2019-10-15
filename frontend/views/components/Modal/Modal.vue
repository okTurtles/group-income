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
      replacement: null,
      isUrlChange: true
    }
  },
  created () {
    sbp('okTurtles.events/on', OPEN_MODAL, component => this.openModal(component))
    sbp('okTurtles.events/on', CLOSE_MODAL, component => {
      this.isUrlChange = false
      this.unloadModal(component)
    })
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
      if (this.isUrlChange) {
        console.log('URLCHANGE')
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
            this.unloadModal()
          }
        }
      } else {
        this.isUrlChange = true
      }
    }
  },
  methods: {
    handleKeyUp (e) {
      // Only if there an active modal
      if (this.content && e.key === 'Escape') {
        e.preventDefault()
        this.unloadModal()
        document.querySelectorAll('button, a, input, select, textarea, [tabindex]:not([tabindex="-1"])')[0].focus()
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
      this.isUrlChange = false
      if (this.content) {
        this.$router.push({ query: { modal: this.content, subcontent: this.activeSubcontent() } }).catch((error) => { console.log(error) })
      } else {
        this.$router.push({ query: {} }).catch(console.error)
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

      if (!this.isUrlChange) {
        if (this.replacement) {
          this.openModal(this.replacement)
          this.replacement = null
        } else {
          this.updateUrl()
        }
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
