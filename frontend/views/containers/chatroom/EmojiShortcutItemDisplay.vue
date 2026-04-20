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
      // Display name of shortcut emoji insertion has a highlighted part if there is a matching text in their display names('colons').
      return this.data.matchStr
        ? this.data.colons.replace(
          new RegExp(this.data.matchStr, 'g'),
          `<span class="c-match-str">${this.data.matchStr}</span>`
        )
        : this.data.colons
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
