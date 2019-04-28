import sbp from '~/shared/sbp.js'
import { CLOSE_MODAL } from '~/frontend/utils/events.js'
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
    window.addEventListener('keyup', (e) => {
      if (e.key === 'Escape') {
        this.close()
      }
    })
  },
  beforeDestroy () {
    window.removeEventListener('keyup', null)
  },
  methods: {
    close (e) {
      sbp('okTurtles.events/emit', CLOSE_MODAL)
    },
    hide () {
      this.isActive = false
    }
  }
}

export default modaMixins
