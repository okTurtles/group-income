<template>
  <div class="c-notification">
    <p class="c-notification-bubble">
      <!-- TODO: #502 - Chat: Add support to markdown formatted text -->
      <slot></slot>
    </p>
  </div>
</template>
<style lang="scss" scoped>
@import "../../../assets/sass/theme/index";

.c-notification {
  text-align: center;

  &-bubble {
    display: inline-block;
    margin: $gi-spacer $gi-spacer 0;
    padding: $gi-spacer-xs $gi-spacer-sm;
    text-align: center;
    max-width: 32rem;
    background-color: $light;
    border-radius: $radius-large;

    @include phablet {
      margin: $gi-spacer $gi-spacer 0;
    }
  }
}
</style>
<script>
export default {
  name: 'MessageNotification'
}
</script>
