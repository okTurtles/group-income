'use strict'

import sbp from '@sbp/sbp'
import { L } from '@common/common.js'
import { CLOSE_MODAL } from '@utils/events.js'
import { mapMutations } from 'vuex'
import ModalClose from './ModalClose.vue'

const modalMixins = {
  props: {
    a11yTitle: {
      type: String,
      // NOTE: this really should be required but I can't find
      // where ModalTemplate is called with `undefined` for a11yTitle
      // see: https://github.com/okTurtles/group-income/issues/2828
      // and: https://github.com/okTurtles/group-income/pull/2820
      default: (L('Modal Title Missing'): string)
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
    },
    modalName: String
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
      // If optional modalName prop is provided, explicitly pass it as the targetModal to unload
      // Otherwise, the modal system will unload the latest modal(Last in, First out).
      this.unload(this.modalName || '')
    },
    unload (targetModal?: string) {
      if (!this.loading) sbp('okTurtles.events/emit', CLOSE_MODAL, targetModal)
    }
  }
}

export default modalMixins
