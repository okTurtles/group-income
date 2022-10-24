const pointerEventsMixin = {
  data (): { pointer: Object } {
    return {
      pointer: {
        evts: []
      }
    }
  },
  methods: {
    onPointerDown (e: Object) {
      const { pointerId, pageX, pageY } = e
      this.pointer.evts.push({
        id: pointerId,
        prev: { x: pageX, y: pageY },
        current: { x: pageX, y: pageY }
      })

      console.log('onPointerDown - id : ', pointerId, e)
    },
    onPointerCancel (e: Object) {
      this.pointer.evts = []

      console.log('onPointerCancel', e)
    },
    onPointerMove (e: Object) {
      if (!this.pointer.evts.length) return

      const { pointerId, pointerType, pageX, pageY } = e
      const evItem = this.pointer.evts.find(({ id }) => id === pointerId)

      if (!evItem) return

      evItem.prev = { x: evItem.current.x, y: evItem.current.y }
      evItem.current = { x: pageX, y: pageY }

      console.log('pointermove item length: ', this.pointer.evts.length)
      if (this.pointer.evts.length === 1) {
        // translation
        this.translate({
          x: evItem.current.x - evItem.prev.x,
          y: evItem.current.y - evItem.prev.y
        })
      } else if (pointerType === 'touch' && this.pointer.evts.length === 2) {
        // pinch in/out
      }
    }
  },
  mounted () {
    this.$el.addEventListener('pointerdown', this.onPointerDown)
    window.addEventListener('pointermove', this.onPointerMove)
    window.addEventListener('pointerup', this.onPointerCancel)
  },
  beforeDestroy () {
    this.$el.removeEventListener('pointerdown', this.onPointerDown)
    window.removeEventListener('pointermove', this.onPointerMove)
    window.removeEventListener('pointerup', this.onPointerCancel)
  }
}

export default pointerEventsMixin
