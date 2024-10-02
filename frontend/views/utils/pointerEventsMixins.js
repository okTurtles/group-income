import { throttle } from '@model/contracts/shared/giLodash.js'
export const PINCH_ZOOM_THRESHOLD = 2.5

const pointerEventsMixin = {
  data (): { pointer: Object, throttledHandlers: Object } {
    return {
      pointer: {
        evts: [],
        prevDistance: null // tracking distance between two pointers when 'pinch' gesture is happening
      },
      throttledHandlers: {
        pointerMoveOnWindow: throttle(this.onPointerMove, 5)
      },
      matchMedia: {
        handler: null,
        isTouch: false
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
      this.pointer.prevDistance = null
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
        const adjustmentFactor = this.matchMedia.isTouch ? 1.5 : 1.2
        this.translate({
          x: (evItem.current.x - evItem.prev.x) * adjustmentFactor,
          y: (evItem.current.y - evItem.prev.y) * adjustmentFactor
        })
        this.pointer.prevDistance = null
      } else if (pointerType === 'touch' && evts.length === 2) {
        // pinch in/out
        const [evt1, evt2] = evts
        const xDist = Math.abs(evt2.current.x - evt1.current.x)
        const yDist = Math.abs(evt2.current.y - evt1.current.y)

        // Calculate distance update factor
        const currentLinearDist = Math.sqrt(xDist * xDist + yDist * yDist)
        const prevLinearDist = this.pointer.prevDistance || currentLinearDist
        const distChangeFactor = Math.abs(currentLinearDist - prevLinearDist)

        if ((currentLinearDist - prevLinearDist) > PINCH_ZOOM_THRESHOLD) {
          this.$emit('pinch-out', distChangeFactor)

          // The component that registers this mixin needs to be able to listen to this custom event too.
          this.pinchOutHandler &&
            this.pinchOutHandler(distChangeFactor)
        } else if ((currentLinearDist - prevLinearDist) < PINCH_ZOOM_THRESHOLD * -1) {
          this.$emit('pinch-in', distChangeFactor)

          // The component that registers this mixin needs to be able to listen to this custom event too.
          this.pinchInHandler &&
            this.pinchInHandler(distChangeFactor)
        }

        this.pointer.prevDistance = currentLinearDist // track it for the next calculation
      }
    }
  },
  mounted () {
    this.$el.addEventListener('pointerdown', this.onPointerDown)
    this.$el.addEventListener('pointermove', this.throttledHandlers.pointerMoveOnWindow)
    this.$el.addEventListener('pointerup', this.onPointerCancel)
    this.$el.addEventListener('pointerout', this.onPointerCancel)
    this.$el.addEventListener('pointercancel', this.onPointerCancel)

    const checkTouch = window.matchMedia('(any-pointer:fine)')
    this.matchMedia.isTouch = !checkTouch.matches
    this.matchMedia.handler = checkTouch

    checkTouch.onchange = (e) => {
      this.matchMedia.isTouch = !e.matches
    }
  },
  beforeDestroy () {
    this.$el.removeEventListener('pointerdown', this.onPointerDown)
    this.$el.removeEventListener('pointermove', this.throttledHandlers.pointerMoveOnWindow)
    this.$el.removeEventListener('pointerup', this.onPointerCancel)
    this.$el.removeEventListener('pointerout', this.onPointerCancel)
    this.$el.removeEventListener('pointercancel', this.onPointerCancel)

    this.matchMedia.handler.onchange = null
  }
}

export default pointerEventsMixin
