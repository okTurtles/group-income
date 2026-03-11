<template lang='pug'>
.c-direct-message-chat-interface
  .c-back-btn-container
    button.link.c-back-btn(@click.stop='backToDMList')
      i.icon-angle-left.c-back-icon
      i18n Back

  | TODO: build and implement the DM chat interface here.
</template>

<script>
import { mapGetters } from 'vuex'
import ChatMixin from '@containers/chatroom/ChatMixin.js'
import { logExceptNavigationDuplicated } from '@view-utils/misc.js'

export default {
  name: 'DirectMessageChatInterface',
  mixins: [ChatMixin],
  computed: {
    ...mapGetters([
      'currentChatRoomId',
      'chatRoomPinnedMessages'
    ]),
    pinnedMessages () {
      const { chatRoomID } = this.summary
      if (this.isJoinedChatRoom(chatRoomID) && chatRoomID === this.currentChatRoomId) {
        return this.chatRoomPinnedMessages
      }
      return []
    }
  },
  methods: {
    backToDMList () {
      this.$router.push({ name: 'GlobalDirectMessages' }).catch(logExceptNavigationDuplicated)
    },
    showPinnedMessages (event) {
      const element = event.target.parentNode.getBoundingClientRect()
      this.$refs.pinnedMessages.open({
        left: `${element.left - 3.2}px`, // 3.2 -> 0.2rem of description element padding
        top: `${element.bottom + 8}px` // 8 -> 0.5rem gap
      }, this.pinnedMessages)
    },
    unpinMessage (messageHash) {
      if (this.$refs.chatMain) {
        this.$refs.chatMain.unpinFromChannel(messageHash)
      }
    },
    scrollToPinnedMessage (messageHash) {
      if (this.$refs.chatMain) {
        this.$refs.chatMain.scrollToMessage(messageHash)
      }
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
    },
    '$route' (to, from) {
      this.$nextTick(() => {
        this.refreshTitle()
      })

      const { chatRoomID } = to.params
      const { mhash } = to.query
      const prevChatRoomId = from.params.chatRoomID || ''

      if (chatRoomID &&
        chatRoomID !== prevChatRoomId &&
        this.isJoinedChatRoom(chatRoomID)) {
        this.updateCurrentChatRoomID(chatRoomID)
      } else if (mhash) {
        console.log('TODO: once ChatMain component is added, add a logic to scroll to mhash')
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
