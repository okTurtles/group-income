<template lang='pug'>
.card.c-chat-interface
  chat-main(ref='chatMain' :summary='summary')
</template>

<script>
import { mapGetters } from 'vuex'
import ChatMixin from '@containers/chatroom/ChatMixin.js'
import ChatMain from '@containers/chatroom/ChatMain.vue'

export default {
  name: 'DirectMessageChatInterface',
  mixins: [ChatMixin],
  components: {
    ChatMain
  },
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

.c-chat-interface {
  padding: 0;
  height: calc(100% - 1.5rem);
  margin-bottom: 1.5rem;
  border-radius: 0.625rem;

  @include phone {
    height: 100%;
    margin: 0 -1rem 0 -1rem;
    border-radius: 0.625rem 0.625rem 0 0;
  }
}
</style>
