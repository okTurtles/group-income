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
    if (location.href.indexOf('?modal') > 0) {
      const url = new URL(location.href)
      this.openModal(url.searchParams.get('modal'), false)
    }
  },
  beforeDestroy () {
    sbp('okTurtles.events/off', LOAD_MODAL, this.openModal)
    sbp('okTurtles.events/off', CLOSE_MODAL, this.closeModal)
  },
  methods: {
    openModal (componentName, pushState = true) {
      this.content = componentName
      sbp('okTurtles.events/emit', OPEN_MODAL)
      if (pushState) {
        history.pushState(null, null, location.href + '?modal=' + componentName)
      }
      window.localStorage.setItem('modal', true)

      // Update the URL to allow back button to close the popup
      window.addEventListener('popstate', (event) => {
        if (window.localStorage.getItem('modal')) {
          window.localStorage.setItem('modal', false)
          sbp('okTurtles.events/emit', CLOSE_MODAL)
        }
        window.removeEventListener('popstate', null, null)
      })
    },
    closeModal () {
      // Avoid event problem
      this.content = null
    }
  }
}
</script>
