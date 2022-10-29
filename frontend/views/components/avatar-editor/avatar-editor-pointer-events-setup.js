import { throttle } from '@model/contracts/shared/giLodash.js'
import { PINCH_ZOOM_THRESHOLD } from './avatar-editor-constants.js'

const pointerEventsMixin = {
  data (): { pointer: Object, throttledHandlers: Object } {
    return {
      pointer: {
        evts: []
      },
      throttledHandlers: {
        pointerMoveOnWindow: throttle(this.onPointerMove, 20)
      }
    }
  },
  methods: {
    onPointerDown (e: Object) {
      const { pointerId, clientX, clientY } = e
      this.pointer.evts.push({
        id: pointerId,
        prev: { x: clientX, y: clientY },
        current: { x: clientX, y: clientY }
      })
    },
    onPointerCancel (e: Object) {
      this.pointer.evts = []
    },
    onPointerMove (e: Object) {
      // reponsible for translation of the image on the canvas
      if (!this.pointer.evts.length) return

      const { pointerId, pointerType, clientX, clientY } = e
      const { evts } = this.pointer
      const evItem = evts.find(({ id }) => id === pointerId)

      if (!evItem) return

      evItem.prev = { x: evItem.current.x, y: evItem.current.y }
      evItem.current = { x: clientX, y: clientY }

      if (evts.length === 1) {
        // translation
        this.translate({
          x: evItem.current.x - evItem.prev.x,
          y: evItem.current.y - evItem.prev.y
        })
      } else if (pointerType === 'touch' && evts.length === 2) {
        // pinch in/out
        const [evt1, evt2] = evts

        const prevXDist = Math.abs(evt2.prev.x - evt1.prev.x)
        const prevYDist = Math.abs(evt2.prev.y - evt1.prev.y)
        const currentXDist = Math.abs(evt2.current.x - evt1.current.x)
        const currentYDist = Math.abs(evt2.current.y - evt1.current.y)

        if ((currentXDist - prevXDist > PINCH_ZOOM_THRESHOLD) ||
          (currentYDist - prevYDist > PINCH_ZOOM_THRESHOLD)) {
          this.$emit('pinch-out')
        } else if ((currentXDist - prevXDist < PINCH_ZOOM_THRESHOLD * -1) ||
          (currentYDist - prevYDist < PINCH_ZOOM_THRESHOLD * -1)) {
          this.$emit('pinch-in')
        }
      }
    }
  },
  mounted () {
    this.$el.addEventListener('pointerdown', this.onPointerDown)
    this.$el.addEventListener('pointermove', this.throttledHandlers.pointerMoveOnWindow)
    this.$el.addEventListener('pointerup', this.onPointerCancel)
    this.$el.addEventListener('pointerout', this.onPointerCancel)
    this.$el.addEventListener('pointercancel', this.onPointerCancel)
  },
  beforeDestroy () {
    this.$el.removeEventListener('pointerdown', this.onPointerDown)
    this.$el.removeEventListener('pointermove', this.throttledHandlers.pointerMoveOnWindow)
    this.$el.removeEventListener('pointerup', this.onPointerCancel)
    this.$el.removeEventListener('pointerout', this.onPointerCancel)
    this.$el.removeEventListener('pointercancel', this.onPointerCancel)
  }
}

export default pointerEventsMixin
