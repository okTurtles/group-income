<template lang='pug'>
div
  component(:is='currentModal' ref='modal' v-bind='childData')
</template>

<script>
import sbp from '@sbp/sbp'
import { OPEN_MODAL, CLOSE_MODAL, REPLACE_MODAL } from '@view-utils/events.js'

export default {
  name: 'Modal',
  data () {
    return {
      currentModal: null,
      childData: null,
      replacement: {
        modal: null,
        childData: null
      }
    }
  },
  methods: {
    open (modalName, childData = null) {
      if (this.currentModal) {
        if (this.currentModal !== modalName) { this.replace(modalName, childData) }

        return
      }

      this.currentModal = modalName
      if (childData) this.childData = childData
    },
    close (modalName = null) {
      this.currentModal = null
      this.childData = null

      if (this.replacement.modal) {
        this.open(this.replacement.modal, this.replacement.childData)

        this.replacement.modal = null
        this.replacement.childData = null
      }
    },
    replace (modalName, childData = null) {
      if (!this.currentModal) {
        this.open(modalName, childData)

        return
      }

      this.replacement.modal = modalName
      this.replacement.childData = childData

      this.$refs.modal.close()
    }
  },
  created () {
    sbp('okTurtles.events/on', OPEN_MODAL, this.open)
    sbp('okTurtles.events/on', CLOSE_MODAL, this.close)
    sbp('okTurtles.events/on', REPLACE_MODAL, this.replace)
  },
  beforeDestroy () {
    sbp('okTurtles.events/off', OPEN_MODAL)
    sbp('okTurtles.events/off', CLOSE_MODAL)
    sbp('okTurtles.events/off', REPLACE_MODAL)
  }
}
</script>
