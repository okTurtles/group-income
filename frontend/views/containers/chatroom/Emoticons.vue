<template lang='pug'>
.c-picker(:class='{ "is-active": isActive }' @click='clickBackDrop')
  .c-picker-wrapper(ref='pickerWrapper' :style='position')
    picker(@select='select' :data='emoji' :show-preview='false' :auto-focus='true')
</template>

<script>
import sbp from '@sbp/sbp'
// TODO: find out how to load the emoji picker at runtime only when the user clicks the emoji button
import { Picker, EmojiIndex } from 'emoji-mart-vue-fast'
import data from 'emoji-mart-vue-fast/data/apple.json'
import { TABLET } from '@view-utils/breakpoints.js'
import { OPEN_EMOTICON, CLOSE_EMOTICON, SELECT_EMOTICON } from '@utils/events.js'
import { debounce } from 'turtledash'

export default ({
  name: 'Emoticons',
  components: {
    Picker
  },
  data () {
    return {
      position: undefined,
      emoji: new EmojiIndex(data),
      pos_x: Number,
      pos_y: Number,
      isActive: false,
      lastFocus: null // Record element that open the modal
    }
  },
  created () {
    sbp('okTurtles.events/on', OPEN_EMOTICON, this.openEmoticon)
    // When press escape it should close the modal
    window.addEventListener('keyup', this.handleKeyUp)
    window.addEventListener('resize', this.resizeHandler)
  },
  beforeDestroy () {
    sbp('okTurtles.events/off', OPEN_EMOTICON)
    window.removeEventListener('keyup', this.handleKeyUp)
    window.removeEventListener('resize', this.resizeHandler)
  },
  methods: {
    handleKeyUp (e) {
      if (this.content && e.key === 'Escape') {
        e.preventDefault()
        this.closeEmoticonDlg()
      }
    },
    openEmoticon (e) {
      if (e) {
        this.pos_x = e.x
        this.pos_y = e.y
      }
      this.lastFocus = document.activeElement
      this.isActive = true

      this.$nextTick(this.focusSearch)
    },
    select (emoticon) {
      sbp('okTurtles.events/emit', SELECT_EMOTICON, emoticon)
      this.closeEmoticonDlg()
    },
    clickBackDrop (e) {
      const element = document.elementFromPoint(e.clientX, e.clientY).closest('.c-picker-wrapper')
      if (!element) {
        this.closeEmoticonDlg()
      }
    },
    closeEmoticonDlg () {
      if (!this.isActive) { return }

      this.isActive = false
      sbp('okTurtles.events/emit', CLOSE_EMOTICON)

      if (this.lastFocus) {
        this.lastFocus.focus()
        this.lastFocus = null
      }
    },
    setPosition () {
      const winWidth = window.innerWidth
      const winHeight = window.innerHeight
      if (winWidth < TABLET) {
        this.position = undefined
        return
      }
      const emotiWidth = 353
      const emotiHeight = 440
      const padding = 16
      const left = Math.min(this.pos_x - emotiWidth / 2, winWidth - padding - emotiWidth / 2)
      let top = this.pos_y - emotiHeight - padding
      if (top < 0) {
        top = this.pos_y + padding
      } else if (top + emotiHeight > winHeight) {
        top = winHeight - emotiHeight
      }
      this.position = { left: `${left}px`, top: `${top}px` }
    },
    debouncedSetPosition: debounce(function () {
      this.setPosition()
    }, 250),
    resizeHandler () {
      if (window.matchMedia('(hover: hover)').matches) {
        // This is a fix for the issue #1954 (https://github.com/okTurtles/group-income/issues/1954)
        // -> closes the pop-up if the viewport size changes only when it's NOT a touch device.
        //    e.g) The viewport size changes when the keyboard tab is pulled out on the touch device.
        this.closeEmoticonDlg()
      }
      this.debouncedSetPosition()
    },
    focusSearch () {
      // It appears that there is no component-level method provided to focus the search. So using browser API instead here.
      // (reference: https://github.com/serebrov/emoji-mart-vue/blob/master/src/components/search.vue)
      const searchInputEl = this.$refs.pickerWrapper.querySelector('.emoji-mart-search input')

      searchInputEl && searchInputEl.focus()
    }
  },
  watch: {
    'pos_x' (to, from) {
      this.setPosition()
    },
    'pos_y' (to, from) {
      this.setPosition()
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
