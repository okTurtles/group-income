<template lang='pug'>
.c-emoji-shortcut-list-item(
  v-bind='$attrs'
  v-on='$listeners'
  :class='{ "is-selected": isSelected }'
)
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
    },
    isSelected: {
      type: Boolean,
      default: false
    }
  }
}
</script>

<style lang="scss" scoped>
@import "@assets/style/_variables.scss";

.c-emoji-shortcut-list-item {
  display: flex;
  align-items: center;
  padding: 0.2rem 0.4rem;

  &.is-selected {
    background-color: $primary_2;
  }

  .c-emoji-native {
    font-size: 1.1em;
  }

  .c-emoji-name {
    display: inline-block;
    margin-left: 0.25rem;
  }
}
</style>
