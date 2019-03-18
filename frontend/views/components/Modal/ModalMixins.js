import sbp from '../../../../shared/sbp.js'
import { OPEN_MODAL, CLOSE_MODAL } from '../../../utils/events.js'
import ModalClose from './ModalClose.vue'

const modaMixins = {
  components: {
    ModalClose
  },
  data () {
    return {
      isActive: false
    }
  },
  mounted () {
    this.isActive = true
    sbp('okTurtles.events/on', OPEN_MODAL, this.openModal)
    sbp('okTurtles.events/on', CLOSE_MODAL, this.closeModal)
    window.addEventListener('keyup', (e) => {
      if (e.key === 'Escape') {
        this.close()
      }
    })
  },
  beforeDestroy () {
    window.removeEventListener('keyup', null)
    sbp('okTurtles.events/off', OPEN_MODAL, this.openModal)
    sbp('okTurtles.events/off', CLOSE_MODAL, this.closeModal)
  },
  methods: {
    close (e) {
      sbp('okTurtles.events/emit', 'close-modal')
    },
    openModal () {
      this.isActive = true
    },
    closeModal () {
      this.isActive = false
      if (location.href.indexOf('?modal') > 0) {
        history.pushState(null, null, location.href.split('?modal=')[0])
      }
    }
  }
}

export default modaMixins
