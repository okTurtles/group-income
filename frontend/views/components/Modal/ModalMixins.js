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
    sbp('okTurtles.events/on', CLOSE_MODAL, ($event) => {
      const el = this.$parent.$options._componentTag
      let modal = this.$route.query.modal
      if (this.$route.query.subcontent) {
        modal = this.$route.query.subcontent
      } else {
        sbp('okTurtles.events/off', CLOSE_MODAL)
      }

      if (el === modal) {
        this.isActive = false
      }
    })
    window.addEventListener('keyup', (e) => {
      if (e.key === 'Escape') {
        this.close()
      }
    })
  },
  beforeDestroy () {
    sbp('okTurtles.events/emit', UNLOAD_MODAL)
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
