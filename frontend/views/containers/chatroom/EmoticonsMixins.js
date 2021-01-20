import { OPEN_EMOTICON, SELECT_EMOTICON, CLOSE_EMOTICON } from '@utils/events.js'
import sbp from '~/shared/sbp.js'

const emoticonsMixins = {
  methods: {
    openEmoticon (e: any) {
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
