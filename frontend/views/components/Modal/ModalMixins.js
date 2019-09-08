import sbp from '~/shared/sbp.js'
import { CLOSE_MODAL } from '~/frontend/utils/events.js'
import ModalClose from './ModalClose.vue'
let keyboardEvent = Event

const modaMixins = {
  data () {
    return {
      isActive: true
    }
  },
  components: {
    ModalClose
  },
  mounted () {
    sbp('okTurtles.events/on', CLOSE_MODAL, this.hide)
    keyboardEvent = window.addEventListener('keyup', (e) => {
      if (e.key === 'Escape') {
        this.close()
      }
    })
  },
  beforeDestroy () {
    sbp('okTurtles.events/off', CLOSE_MODAL, this.hide)
    window.removeEventListener('keyup', keyboardEvent)
  },
  methods: {
    close (e) {
      sbp('okTurtles.events/emit', CLOSE_MODAL)
    },
    hide () {
      // Only the last open modal should close
      // TODO: find a more eleguant way to identify the current instance
      // Maybe saving the name in the modal ?
      const instance = this.$parent.$options._componentTag
      const query = this.$route.query
      if (query) {
        const subcontent = query.subcontent
        if (subcontent) {
          if (subcontent === instance) this.isActive = false
          // Don't do anything if it's not the last modal
          return false
        }
      }
      this.isActive = false
    }
  }
}

export default modaMixins
