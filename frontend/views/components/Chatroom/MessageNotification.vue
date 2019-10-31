<template lang='pug'>
.c-notification
  p.c-notification-bubble
    // TODO: #502 - Chat: Add support to markdown formatted text
    slot
</template>

<script>
export default {
  name: 'MessageNotification'
}
</script>

<style lang="scss" scoped>
@import "_variables.scss";

.c-notification {
  text-align: center;

  &-bubble {
    display: inline-block;
    margin: $spacer $spacer 0;
    padding: $spacer-xs $spacer-sm;
    text-align: center;
    max-width: 32rem;
    background-color: $general_2;
    border-radius: $radius-large;

    @include tablet {
      margin: $spacer $spacer 0;
    }
  }
}
</style>
