import { OPEN_EMOTICON, SELECT_EMOTICON, CLOSE_EMOTICON } from '@utils/events.js'
import sbp from '@sbp/sbp'

const emoticonsMixins = {
  methods: {
    openEmoticon (e: any) {
      sbp('okTurtles.events/emit', OPEN_EMOTICON, e)
      sbp('okTurtles.events/once', CLOSE_EMOTICON, this.closeEmoticon)
      sbp('okTurtles.events/once', SELECT_EMOTICON, this.selectEmoticon)
    },
    closeEmoticon () {
      sbp('okTurtles.events/off', SELECT_EMOTICON)
    }
  }
}

export default emoticonsMixins
