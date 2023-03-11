<template lang='pug'>
div
  component(:is='currentModal' ref='modal')
</template>

<script>
import sbp from '@sbp/sbp'
import { OPEN_MODAL, CLOSE_MODAL } from '@view-utils/events.js'

export default {
  name: 'Modal',
  data () {
    return {
      currentModal: null
    }
  },
  methods: {
    open (modalName) {
      this.currentModal = modalName
    },
    close () {
      this.currentModal = null
    },
    replace (modalName) {
      // TODO!
    }
  },
  created () {
    sbp('okTurtles.events/on', OPEN_MODAL, this.open)
    sbp('okTurtles.events/on', CLOSE_MODAL, this.close)
  },
  beforeDestroy () {
    sbp('okTurtles.events/off', OPEN_MODAL)
    sbp('okTurtles.events/off', CLOSE_MODAL)
  }
}
</script>
