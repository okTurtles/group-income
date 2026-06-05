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
        // NOTE: this block handles the behavior to scroll to the message with mhash
        //       when user clicks the message link of the one from current chatroom.
        this.$refs.chatMain?.scrollToMessage(mhash).then(() => {
          // NOTE: delete mhash from queries after scroll to and highlight it
          const newQuery = { ...to.query }
          delete newQuery.mhash
          this.$router.replace({ query: newQuery })
        })
      }
    }
  }
}
</script>

<style lang="scss" scoped>
@import "@assets/style/_variables.scss";

.c-chat-interface {
  height: 100%;
  padding: 0;
  margin-bottom: 1.5rem;
  border-radius: 0.625rem;

  @include phone {
    height: 100%;
    margin: 0 -1rem 0 -1rem;
    border-radius: 0.625rem 0.625rem 0 0;
  }
}
</style>
