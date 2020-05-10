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
@import "@assets/style/_variables.scss";

.c-notification {
  text-align: center;

  &-bubble {
    display: inline-block;
    margin: 1rem 1rem 0;
    padding: 0.25rem 0.5rem;
    text-align: center;
    max-width: 32rem;
    background-color: $general_2;
    border-radius: $radius-large;

    @include tablet {
      margin: 1rem 1rem 0;
    }
  }
}
</style>
