import sbp from '@sbp/sbp'
import { OPEN_EMOTICON, SELECT_EMOTICON, CLOSE_EMOTICON } from '@utils/events.js'

const emoticonsMixins = {
  methods: {
    openEmoticon (e: any) {
      if (e?.detail === 0 && e.currentTarget) {
        // e.detail holds the number of clicks that occurred and in case of keyboard-initiated click, it is 0.
        // Such a click carries no pointer coordinates, so anchor the emoticon picker to the center of the clicked element.
        const bbox = e.currentTarget.getBoundingClientRect()
        e = {
          x: bbox.left + bbox.width / 2,
          y: bbox.top + bbox.height / 2
        }
      }

      sbp('okTurtles.events/emit', OPEN_EMOTICON, e)
      sbp('okTurtles.events/on', CLOSE_EMOTICON, this.closeEmoticon)
      sbp('okTurtles.events/on', SELECT_EMOTICON, this.selectEmoticon)
    },
    closeEmoticon () {
      sbp('okTurtles.events/off', CLOSE_EMOTICON)
      sbp('okTurtles.events/off', SELECT_EMOTICON)
    }
  }
}

export default emoticonsMixins
