<template lang='pug'>
.c-emoji-selection-simple
  menu.c-emoji-selection-list-container(v-if='ephemeral.isActive')
    li.c-emoji-list-item(
      v-for='emoji in ephemeral.emojiList'
      :key='emoji.id'
      role='button'
      tabindex='0'
      @click.stop='onEmojiSelect(emoji)'
      @keydown.enter='onEmojiSelect(emoji)'
      @keydown.space='onEmojiSelect(emoji)'
    )
      span.c-emoji-native {{ emoji.native }}
      span.c-emoji-name {{ emoji.colons }}
</template>

<script>
import sbp from '@sbp/sbp'
import { QUERY_EMOJI_SELECTION_SIMPLE, CLOSE_EMOJI_SELECTION_SIMPLE } from '@utils/events.js'
import { searchEmoji } from './emoji-utils.js'

export default {
  name: 'EmojiSelectionSimple',
  data () {
    return {
      ephemeral: {
        isActive: false,
        emojiList: []
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
    performEmojiSearch (query = '') {
      if (query && query.trim() !== '') {
        const searchResult = searchEmoji(query.trim())
        if (searchResult.length > 0) {
          this.ephemeral.emojiList = searchResult.map((item) => {
            return {
              colons: item.colons,
              name: item.name,
              native: item.native,
              id: item.id || item.colons
            }
          })
          this.ephemeral.isActive = true
        }
      }
    },
    onEmojiSelect (emoji) {
      console.log('!@# TODO emoji selected!: ', emoji)
    }
  },
  created () {
    sbp('okTurtles.events/on', QUERY_EMOJI_SELECTION_SIMPLE, this.performEmojiSearch)
    sbp('okTurtles.events/on', CLOSE_EMOJI_SELECTION_SIMPLE, this.closePopup)
  },
  beforeDestroy () {
    sbp('okTurtles.events/off', QUERY_EMOJI_SELECTION_SIMPLE)
    sbp('okTurtles.events/off', CLOSE_EMOJI_SELECTION_SIMPLE)
  },
  mounted () {
    this.performEmojiSearch('Ch')
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
  z-index: $zindex-tooltip;
  pointer-events: none;
}

.c-emoji-selection-list-container {
  position: absolute;
  display: block;
  bottom: 1.5rem;
  left: 0;
  width: 100%;
  pointer-events: initial;
}
</style>
