import {
  sbp,
  OPEN_EMOTICON, SELECT_EMOTICON, CLOSE_EMOTICON
} from '/assets/js/common.js' // eslint-disable-line import/no-absolute-path

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
