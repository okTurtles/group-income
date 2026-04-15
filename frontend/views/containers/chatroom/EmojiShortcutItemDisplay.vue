<template lang='pug'>
.c-emoji-shortcut-list-item
  span.c-emoji-native {{ data.native }}
  span.c-emoji-name {{ data.colons }}
</template>

<script>
export default {
  name: 'EmojiShortcutListItem',
  props: {
    data: {
      type: Object,
      required: true
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

  .c-emoji-name {
    display: inline-block;
    margin-left: 0.25rem;
  }
}
</style>
