<template lang='pug'>
.c-emoji-selection-simple
  .c-emoji-selection-list-container
    input.input(
      type='text'
      v-model='ephemeral.searchQuery'
      @input='onQueryInput'
    )
</template>

<script>
import sbp from '@sbp/sbp'
import { OPEN_EMOJI_SELECTION_SIMPLE, CLOSE_EMOJI_SELECTION_SIMPLE } from '@utils/events.js'
import { searchEmoji } from './emoji-utils.js'

export default {
  name: 'EmojiSelectionSimple',
  data () {
    return {
      ephemeral: {
        isActive: false,
        searchQuery: ''
      }
    }
  },
  methods: {
    openPopup () {
      this.ephemeral.isActive = true
    },
    closePopup () {
      this.ephemeral.isActive = false
    },
    onQueryInput () {
      console.log('TODO!')
    }
  },
  watch: {
    'ephemeral.searchQuery' (query) {
      if (query && query.trim() !== '') {
        const searchResult = searchEmoji(query)
        console.log('!@# search result!: ', searchResult)
      }
    }
  },
  created () {
    sbp('okTurtles.events/on', OPEN_EMOJI_SELECTION_SIMPLE, this.openPopup)
    sbp('okTurtles.events/on', CLOSE_EMOJI_SELECTION_SIMPLE, this.closePopup)
  },
  beforeDestroy () {
    sbp('okTurtles.events/off', OPEN_EMOJI_SELECTION_SIMPLE)
    sbp('okTurtles.events/off', CLOSE_EMOJI_SELECTION_SIMPLE)
  }
}
</script>

<style lang='scss' scoped>
@import "@assets/style/_variables.scss";

.c-emoji-selection-simple {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.5);
  z-index: $zindex-tooltip;
}

.c-emoji-selection-list-container {
  position: absolute;
  display: block;
  bottom: 1.5rem;
  right: 1.5rem;
}
</style>
