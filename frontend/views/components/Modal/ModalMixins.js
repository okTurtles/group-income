import sbp from '~/shared/sbp.js'
import { CLOSE_MODAL, UNLOAD_MODAL } from '~/frontend/utils/events.js'
import ModalClose from './ModalClose.vue'

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
    sbp('okTurtles.events/on', CLOSE_MODAL, this.close)
  },
  beforeDestroy () {
    sbp('okTurtles.events/off', CLOSE_MODAL)
  },
  methods: {
    close (e) {
      this.isActive = false
      setTimeout(() => {
        sbp('okTurtles.events/emit', UNLOAD_MODAL)
      }, 300)
    }
  }
}

export default modaMixins
