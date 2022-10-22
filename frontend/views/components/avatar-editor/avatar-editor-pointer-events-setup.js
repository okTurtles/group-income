const pointerEventsMixin = {
  data (): { pointerEv: Object } {
    return {
      pointerEv: []
    }
  },
  methods: {
    onPointerDown (e: Object) {
      const { pointerId, clientX, clientY } = e
      this.pointerEv.push({
        id: pointerId,
        prev: { x: clientX, y: clientY },
        current: { x: clientX, y: clientY }
      })

      console.log('onPointerDown - id : ', pointerId)
    },
    onPointerCancel (e: Object) {
      this.pointerEv = []

      console.log('onPointerCancel')
    },
    onPointerMove (e: Object) {
      const { pointerId, pointerType, clientX, clientY } = e
      const evItem = this.pointerEv.find(({ id }) => id === pointerId)

      if (!evItem) return

      evItem.prev = { x: evItem.current.x, y: evItem.current.y }
      evItem.current = { x: clientX, y: clientY }

      if (this.pointerEv.length === 1) {
        // translation
        this.translate({
          x: evItem.current.x - evItem.prev.x,
          y: evItem.current.y - evItem.prev.y
        })
        console.log(`translation dx: ${evItem.current.x - evItem.prev.x}, dy: ${evItem.current.y - evItem.prev.y}`)
      } else if (pointerType === 'touch' && this.pointerEv.length === 2) {
        // pinch in/out
      }
    }
  },
  mounted () {
    this.$el.addEventListener('pointerdown', this.onPointerDown)
    this.$el.addEventListener('pointermove', this.onPointerMove)
    this.$el.addEventListener('pointerup', this.onPointerCancel)
    this.$el.addEventListener('pointerout', this.onPointerCancel)
    this.$el.addEventListener('pointerleave', this.onPointerCancel)
    this.$el.addEventListener('pointercancel', this.onPointerCancel)
  },
  beforeDestroy () {
    this.$el.removeEventListener('pointerdown', this.onPointerDown)
    this.$el.removeEventListener('pointermove', this.onPointerMove)
    this.$el.removeEventListener('pointerup', this.onPointerCancel)
    this.$el.removeEventListener('pointerout', this.onPointerCancel)
    this.$el.removeEventListener('pointerleave', this.onPointerCancel)
    this.$el.removeEventListener('pointercancel', this.onPointerCancel)
  }
}

export default pointerEventsMixin
