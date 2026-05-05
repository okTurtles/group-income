<template lang='pug'>
.c-emoji-shortcut-list-item
  span.c-emoji-native {{ data.native }}
  span.c-emoji-colons(v-safe-html='emojiColonsDisplay')
</template>

<script>
export default {
  name: 'EmojiShortcutListItem',
  props: {
    data: {
      type: Object,
      required: true
    }
  },
  computed: {
    emojiColonsDisplay () {
      if (this.data.matchStr) {
        // Escape regex special characters first, so that they don't fail in new RegExp() constructor.
        // e.g. when ':+1' is entered, new RegExp('+1', 'g') throws 'SyntaxError: Nothing to repeat'. '+1' needs to be escaped as '\+1'.
        const escaped = this.data.matchStr.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
        return this.data.colons.replace(
          new RegExp(escaped, 'g'),
          `<span class="c-match-str">${this.data.matchStr}</span>`
        )
      }
      return this.data.colons
    }
  }
}
</script>

<style lang="scss" scoped>
@import "@assets/style/_variables.scss";

.c-emoji-shortcut-list-item {
  display: flex;
  align-items: center;

  .c-emoji-native {
    font-size: 1.1em;
  }

  .c-emoji-colons {
    display: inline-block;
    margin-left: 0.25rem;

    ::v-deep .c-match-str {
      color: $success_0;
      font-weight: 700;
    }
  }
}
</style>
