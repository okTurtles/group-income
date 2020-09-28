import sbp from '~/shared/sbp.js'
import { CLOSE_MODAL } from '~/frontend/utils/events.js'
import { mapMutations } from 'vuex'
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
    },
    loading: {
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
    if (this.loading === 'Loading') this.setTemporaryReducedMotion()
    document.removeEventListener('keydown', this.trapFocus)
  },
  components: {
    ModalClose
  },
  methods: {
    ...mapMutations([
      'setTemporaryReducedMotion'
    ]),
    close (e) {
      this.modalIsActive = false
    },
    unload () {
      sbp('okTurtles.events/emit', CLOSE_MODAL)
    }
  }
}

export default modaMixins
