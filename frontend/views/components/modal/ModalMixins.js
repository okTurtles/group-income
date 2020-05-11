import sbp from '~/shared/sbp.js'
import { CLOSE_MODAL } from '~/frontend/utils/events.js'
import ModalClose from './ModalClose.vue'

const modaMixins = {
  props: {
    a11yTitle: {
      type: String,
      required: true
    },
    backOnMobile: {
      type: Boolean,
      default: false
    }
  },
  data () {
    return {
      modalIsActive: true
    }
  },
  mounted () {
    document.addEventListener('keydown', this.trapFocus)
  },
  beforeDestroy () {
    document.removeEventListener('keydown', this.trapFocus)
  },
  components: {
    ModalClose
  },
  methods: {
    close (e) {
      this.modalIsActive = false
    },
    unload () {
      sbp('okTurtles.events/emit', CLOSE_MODAL)
    }
  }
}

export default modaMixins
