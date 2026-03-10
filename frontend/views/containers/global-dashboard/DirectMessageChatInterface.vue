<template lang='pug'>
.c-direct-message-chat-interface
  .c-back-btn-container
    button.link.c-back-btn(@click.stop='backToDMList')
      i.icon-angle-left.c-back-icon
      i18n Back

  | TODO: build and implement the DM chat interface here.
</template>

<script>
import { logExceptNavigationDuplicated } from '@view-utils/misc.js'

export default {
  name: 'DirectMessageChatInterface',
  methods: {
    backToDMList () {
      this.$router.push({ name: 'GlobalDirectMessages' }).catch(logExceptNavigationDuplicated)
    }
  }
}
</script>

<style lang="scss" scoped>
@import "@assets/style/_variables.scss";

.c-back-btn-container {
  margin-bottom: 2rem;
}

.c-back-btn {
  border-bottom: none;

  .c-back-icon {
    display: inline-block;
    margin-right: 0.375rem;
  }
}
</style>
