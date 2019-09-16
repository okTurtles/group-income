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
      isActive: true
    }
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
    }
  }
}

export default modaMixins
