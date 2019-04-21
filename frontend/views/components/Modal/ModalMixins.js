import sbp from '~/shared/sbp.js'
import { CLOSE_MODAL } from '~/frontend/utils/events.js'
import ModalClose from './ModalClose.vue'

const modaMixins = {
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
    }
  }
}

export default modaMixins
