<template lang='pug'>
.c-direct-message-chat-interface
  .c-back-btn-container
    button.link.c-back-btn(@click.stop='backToDMList')
      i.icon-angle-left.c-back-icon
      i18n Back

  | TODO: build and implement the DM chat interface here.
</template>

<script>
import ChatMixin from '@containers/chatroom/ChatMixin.js'
import { logExceptNavigationDuplicated } from '@view-utils/misc.js'

export default {
  name: 'DirectMessageChatInterface',
  mixins: [ChatMixin],
  methods: {
    backToDMList () {
      this.$router.push({ name: 'GlobalDirectMessages' }).catch(logExceptNavigationDuplicated)
    }
  },
  watch: {
    summary: {
      immediate: true,
      handler (to) {
        if (to) {
          console.log('!@# chatroom summary changed', to)
          this.$emit('chatroom-summary-change', to)
        }
      }
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
