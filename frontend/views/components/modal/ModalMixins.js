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
    modalForceAction: {
      type: Boolean,
      default: false
    },
    loading: {
      type: Boolean,
      default: false
    }
  },
  data (): {|modalIsActive: boolean|} {
    return {
      modalIsActive: true
    }
  },
  mounted () {
    document.addEventListener('keydown', this.trapFocus)
  },
  beforeDestroy () {
    if (this.loading) this.setTemporaryReducedMotion()
    document.removeEventListener('keydown', this.trapFocus)
  },
  components: {
    ModalClose
  },
  methods: {
    ...(mapMutations([
      'setTemporaryReducedMotion'
    ]): any),
    close (e: any) {
      if (!this.modalForceAction) {
        this.modalIsActive = false
      }
    },
    unload () {
      if (!this.loading) sbp('okTurtles.events/emit', CLOSE_MODAL)
    }
  }
}

export default modaMixins
