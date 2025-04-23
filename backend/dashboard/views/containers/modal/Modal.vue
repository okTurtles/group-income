<template lang='pug'>
div
  component(:is='currentModal' ref='modal' v-bind='childData')
  prompt(v-if='promptConfig.isOpen' v-bind='promptConfig.props')
</template>

<script>
import sbp from '@sbp/sbp'
import { OPEN_MODAL, CLOSE_MODAL, REPLACE_MODAL, OPEN_PROMPT, CLOSE_PROMPT } from '@view-utils/events.js'
import Prompt from '@containers/modal/Prompt.vue'

export default {
  name: 'Modal',
  components: {
    Prompt
  },
  data () {
    return {
      currentModal: null,
      childData: null,
      replacement: {
        modal: null,
        childData: null
      },
      promptConfig: {
        isOpen: false,
        props: null
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
    close () {
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
    },
    openPrompt (promptProps = null) {
      if (promptProps) {
        this.promptConfig.isOpen = true
        this.promptConfig.props = promptProps
      }
    },
    closePrompt () {
      this.promptConfig.isOpen = false
      this.promptConfig.props = null
    }
  },
  created () {
    sbp('okTurtles.events/on', OPEN_MODAL, this.open)
    sbp('okTurtles.events/on', CLOSE_MODAL, this.close)
    sbp('okTurtles.events/on', REPLACE_MODAL, this.replace)
    sbp('okTurtles.events/on', OPEN_PROMPT, this.openPrompt)
    sbp('okTurtles.events/on', CLOSE_PROMPT, this.closePrompt)
  },
  beforeDestroy () {
    sbp('okTurtles.events/off', OPEN_MODAL)
    sbp('okTurtles.events/off', CLOSE_MODAL)
    sbp('okTurtles.events/off', REPLACE_MODAL)
    sbp('okTurtles.events/off', OPEN_PROMPT)
    sbp('okTurtles.events/off', CLOSE_PROMPT)
  }
}
</script>
