<template lang='pug'>
  div
    component(:is='content' ref='content' v-bind='childData[content]')
    component(v-if='activeSubContent' :is='activeSubContent' ref='subcontent' v-bind='childData[activeSubContent]')
</template>
<script>
import sbp from '@sbp/sbp'
import { OPEN_MODAL, REPLACE_MODAL, CLOSE_MODAL, SET_MODAL_QUERIES } from '@utils/events.js'
import { omit } from 'turtledash'

export default ({
  name: 'Modal',
  data () {
    return {
      content: null, // Main modal
      subcontent: [], // Collection of modal on top of modals
      queries: { // Queries to be used by modals
        // [modalName]: { queryKey: queryValue }
      },
      replacementQueries: {}, // queries to be used for REPLACE_MODAL
      replacementChildData: {}, // child-data to be used for REPLACE_MODAL
      childData: {},
      replacement: null, // Replace the modal once the first one is close without updating the url
      lastFocus: null // Record element that open the modal
    }
  },
  computed: {
    activeSubContent () {
      return this.subcontent.length ? this.subcontent[this.subcontent.length - 1] : null
    }
  },
  created () {
    sbp('okTurtles.events/on', OPEN_MODAL, this.openModal)
    sbp('okTurtles.events/on', CLOSE_MODAL, this.unloadModal)
    sbp('okTurtles.events/on', REPLACE_MODAL, this.replaceModal)
    sbp('okTurtles.events/on', SET_MODAL_QUERIES, this.setModalQueries)
    // When press escape it should close the modal
    window.addEventListener('keyup', this.handleKeyUp)
  },
  mounted () {
    const { modal, subcontent } = this.$route.query
    if (modal) this.openModal(modal)
    if (subcontent) this.openModal(subcontent)
  },
  beforeDestroy () {
    sbp('okTurtles.events/off', OPEN_MODAL)
    sbp('okTurtles.events/off', CLOSE_MODAL)
    sbp('okTurtles.events/off', REPLACE_MODAL)
    sbp('okTurtles.events/off', SET_MODAL_QUERIES)
    window.removeEventListener('keyup', this.handleKeyUp)
  },
  watch: {
    '$route' (to, from) {
      const toModal = to.query.modal

      if (toModal) {
        // We reset the modals with no animation for simplicity
        if (toModal !== this.content) {
          if (this.content) this.replaceModal(toModal, omit(to.query, 'modal')) // if another modal is already open, replace it.
          else this.content = toModal
        }

        // Sometimes, the query string for modal has both 'modal' and 'subcontent' eg.) '/app/?modal=SignupModal&subcontent=Prompt'
        if (to.query.subcontent) {
          const subContentTo = to.query.subcontent.split('+').pop()
          if (subContentTo !== this.activeSubContent) {
            // Try to find the target subcontent in the list of subcontent
            const i = this.subcontent.indexOf(subContentTo)
            if (i !== -1) {
              this.subcontent = this.subcontent.slice(0, i)
            } else {
              this.subcontent = [subContentTo]
            }
          }
        }
      } else {
        // Prevent a bug where we click to close a modal at the same time we
        // redirect a page (ex: setting modal -> logout). Sometimes the logout
        // and redirect would happen before the modal closes. At this moment
        // from.query.modal doesn't exist anymore. But the modal should be closed,
        // so we force the unloadModal.
        if (this.content) {
          this.unloadModal()
        }
      }
    }
  },
  methods: {
    handleKeyUp (e) {
      if (this.content && e.key === 'Escape') {
        e.preventDefault()
        this.unloadModal()
      }
    },
    updateUrl () {
      const subContentLen = this.subcontent.length
      if (this.content || subContentLen > 0) {
        const contentQueries = this.queries[this.content] || {}
        const subContentQueries = this.queries[this.subcontent[subContentLen - 1]] || {}
        this.$router.push({
          query: {
            ...this.$route.query,
            ...contentQueries,
            ...subContentQueries,
            modal: this.content,
            subcontent: subContentLen ? this.subcontent.join('+') : undefined
          }
        }).catch(console.error)
      } else if (this.$route.query.modal || this.$route.query.subcontent) {
        const rQueries = { ...this.$route.query }
        const queriesToDelete = {
          modal: true,
          subcontent: true,
          ...this.queries[rQueries.modal]
        }

        for (const mQuery in queriesToDelete) {
          delete rQueries[mQuery]
        }

        this.$router.push({ rQueries }).catch(console.error)
      }
    },
    openModal (componentName, queries = {}, childData = {}) {
      // Don't open the same kind of modal twice.
      if (this.content === componentName) return

      this.lastFocus = document.activeElement
      if (this.content && !this.subcontent.includes(componentName)) {
        this.subcontent.push(componentName)
      } else {
        this.content = componentName
      }
      this.queries[componentName] = queries
      this.updateUrl()
      this.childData[componentName] = childData
    },
    unloadModal (targetModal = '') {
      const clearChildData = key => { delete this.childData[key] }
      const hasSubContent = this.subcontent.length > 0
      let unloadDone = false
      const unloadFromContentAndReFocus = (targetModal) => {
        clearChildData(targetModal)
        this.content = null
        unloadDone = true
        // Refocus on the button that opened this modal, if any.
        // TODO - find a way to support lastFocus when opened through profile|notifications card.
        if (this.lastFocus) this.lastFocus.focus()
      }

      if (targetModal) {
        // when it's queried to close a particular modal, check if it's being presented now and unload it if so.
        if (hasSubContent && this.subcontent.indexOf(targetModal) >= 0) {
          clearChildData(targetModal)
          this.subcontent = this.subcontent.filter(modalName => modalName !== targetModal)
          unloadDone = true
        } else if (this.content === targetModal) {
          unloadFromContentAndReFocus(targetModal)
        }
      } else {
        // when there is no particular modal queried, unload the latest one first.
        if (hasSubContent) {
          clearChildData(this.activeSubContent)
          this.subcontent.pop()
          unloadDone = true
        } else {
          unloadFromContentAndReFocus(this.content)
        }
      }

      if (!unloadDone) { return } // If nothing has been unloaded, no need to perform below actions.

      if (this.replacement) {
        this.openModal(
          this.replacement,
          this.replacementQueries[this.replacement],
          this.replacementChildData[this.replacement]
        )

        delete this.replacementQueries[this.replacement]
        delete this.replacementChildData[this.replacement]
        this.replacement = null
      } else {
        this.updateUrl()
      }
    },
    replaceModal (componentName, queries = null, childData = null) {
      this.replacement = componentName
      // At the moment you can only replace a modal if it's the main one by design
      // Use direct children instead of sbp to wait for animation out
      if (queries) {
        this.replacementQueries[componentName] = queries
      }
      if (childData) {
        this.replacementChildData[componentName] = childData
      }

      this.$refs[this.activeSubContent ? 'subcontent' : 'content'].$children[0].close()
    },
    setModalQueries (componentName, queries) {
      this.queries[componentName] = queries
    }
  }
}: Object)
</script>
