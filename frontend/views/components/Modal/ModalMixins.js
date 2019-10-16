import sbp from '~/shared/sbp.js'
import { CLOSE_MODAL } from '~/frontend/utils/events.js'
import ModalClose from './ModalClose.vue'

const modaMixins = {
  props: {
    backOnMobile: {
      type: Boolean,
      default: false
    }
  },
  data () {
    return {
      isActive: true,
      focusableChildren: []
    }
  },
  mounted () {
    const focusableElementsString =
      'a[href], area[href], ' +
      'input:not([disabled]), select:not([disabled]), textarea:not([disabled]), ' +
      'button:not([disabled]), iframe, object, embed, [tabindex="0"], [contenteditable]'

    this.focusableChildren = Array.from(this.$el.querySelectorAll(focusableElementsString))
  },
  components: {
    ModalClose
  },
  methods: {
    close (e) {
      this.isActive = false
    },
    unload () {
      sbp('okTurtles.events/emit', CLOSE_MODAL)
    },
    trapFocus (e) {
      const currentFocus = document.activeElement
      const totalOfFocusable = this.focusableChildren.length
      const focusedIndex = this.focusableChildren.indexOf(currentFocus)
      if (e.shiftKey) {
        if (focusedIndex === 0) {
          e.preventDefault()
          this.focusableChildren[totalOfFocusable - 1].focus()
        }
      } else {
        if (focusedIndex === totalOfFocusable - 1) {
          e.preventDefault()
          this.focusableChildren[0].focus()
        }
      }
    }
  }
}

export default modaMixins
