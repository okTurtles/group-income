<template lang='pug'>
.c-notification
  // TODO: #502 - Chat: Add support to markdown formatted text
  p.c-text(v-if='text') {{text}}
</template>

<script>
export default {
  name: 'MessageNotification',
  props: {
    text: String
  }
}
</script>

<style lang="scss" scoped>
@import "@assets/style/_variables.scss";

.c-notification {
  text-align: center;
  position: relative;

  p {
    background: $background_0;
    position: relative;
    padding: .5rem;
  }

  &:before {
    content: '';
    height: 1px;
    width: 100%;
    background-color: $general_0;
    position: absolute;
    left: 0;
    top: 50%;
  }
}

.c-text {
  display: inline-block;
  background-color: $background_0;
  margin: 0 auto;
}
</style>
