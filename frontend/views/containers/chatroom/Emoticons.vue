<template lang='pug'>
.c-picker(:class='{ "is-active": isActive }' @click='isActive = false')
  .c-picker-wrapper(:style='position')
    picker(@select='select' :data='emoji' :show-preview='false')
</template>

<script>
import sbp from '@sbp/sbp'
// TODO: find out how to load the emoji picker at runtime only when the user clicks the emoji button
import { Picker, EmojiIndex } from 'emoji-mart-vue-fast'
import data from 'emoji-mart-vue-fast/data/apple.json'
import { TABLET, DESKTOP } from '@view-utils/breakpoints.js'
import { OPEN_EMOTICON, CLOSE_EMOTICON, SELECT_EMOTICON } from '@utils/events.js'

export default ({
  name: 'Chatroom',
  components: {
    Picker
  },
  data () {
    return {
      emoji: new EmojiIndex(data),
      pos_x: Number,
      pos_y: Number,
      isActive: false,
      lastFocus: null, // Record element that open the modal
      ephemeral: {}
    }
  },
  created () {
    sbp('okTurtles.events/on', OPEN_EMOTICON, this.openEmoticon)
    // When press escape it should close the modal
    window.addEventListener('keyup', this.handleKeyUp)
    window.addEventListener('resize', this.closeEmoticon)
  },
  beforeDestroy () {
    sbp('okTurtles.events/off', OPEN_EMOTICON)
    window.removeEventListener('keyup', this.handleKeyUp)
    window.removeEventListener('resize', this.closeEmoticon)
  },
  computed: {
    position () {
      const winWidth = window.innerWidth
      const winHeight = window.innerHeight
      if (winWidth < TABLET) return
      const emotiWidth = 353
      const emotiHeight = 440
      const padding = 16
      // let left = winWidth / 2 - emotiWidth / 2
      let left = '50%'
      let top = this.pos_y - emotiHeight - padding
      if (winWidth > DESKTOP) {
        left = this.pos_x - emotiWidth / 2
      }
      if (top < 0) {
        top = this.pos_y + padding
      }
      if (top + emotiHeight > winHeight) {
        top = winHeight - emotiHeight
      }
      return {
        left: `${left}px`,
        top: `${top}px`
      }
    }
  },
  methods: {
    handleKeyUp (e) {
      if (this.content && e.key === 'Escape') {
        e.preventDefault()
        this.closeEmoticon()
      }
    },
    openEmoticon (e) {
      if (e) {
        this.pos_x = e.x
        this.pos_y = e.y
      }
      this.lastFocus = document.activeElement
      this.isActive = true
    },
    select (emoticon) {
      sbp('okTurtles.events/emit', SELECT_EMOTICON, emoticon)
    },
    closeEmoticon () {
      this.isActive = false
      sbp('okTurtles.events/emit', CLOSE_EMOTICON)
    }
  }
}: Object)
</script>
<style lang="scss">
@import "@assets/style/components/_emoji-mart.scss";
</style>

<style lang="scss" scoped>
@import "@assets/style/_variables.scss";

.c-picker {
  position: fixed;
  top: 0;
  z-index: $zindex-tooltip;
  left: 0;
  width: 100%;
  height: 0;
  pointer-events: none;
  overflow: hidden;

  &.is-active {
    pointer-events: initial;
    height: 100%;

    .c-picker-wrapper {
      pointer-events: initial;
      max-height: 30rem;
      opacity: 1;
      transition: opacity cubic-bezier(0.25, 0.46, 0.45, 0.94) 0.3s;
    }
  }
}

.c-picker-wrapper {
  @extend %floating-panel;
  position: absolute;
  box-shadow: 0 0.5rem 1.25rem rgba(54, 54, 54, 0.3);
  max-height: 0;
  opacity: 0;
  overflow: hidden;
  pointer-events: none;
  padding-bottom: 0;

  .emoji-mart {
    @include phone {
      width: 100% !important;
    }
  }
}
</style>
