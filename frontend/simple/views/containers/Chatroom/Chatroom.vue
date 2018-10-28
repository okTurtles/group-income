<template>
  <main class="c-chatroom">
    <chat-nav :title="title">
      <slot></slot>
    </chat-nav>
    <!-- TODO/REVIEW - design empty state when no conversation is selected?  -->
    <chat-main :info="chatData.info" :conversation="chatData.conversation" />
  </main>
</template>
<style lang="scss" scoped>
@import "../../../assets/sass/theme/index";

.c-chatroom {
  padding: 0;
  display: flex;
  flex-direction: row;
  align-items: stretch;
  height: 100vh;
}
</style>
<script>
import { users, messageConversations } from './fakeStore.js'
import ChatMain from '../../components/Chatroom/ChatMain.vue'
import ChatNav from '../../components/Chatroom/ChatNav.vue'

export default {
  name: 'Chatroom',
  components: {
    ChatMain,
    ChatNav
  },
  props: {
    title: String,
    currentConversation: Object
  },
  data () {
    return {}
  },
  computed: {
    chatData () {
      // BUG: populate with currentConversation when $route.params are empty
      const { type, id } = this.$route.params.currentConversation || {}

      console.log('currentConversationId', { id, type })

      if (type === 'messages') {
        document.title = users[id].name

        return {
          info: {
            type,
            title: users[id].displayName || users[id].name,
            description: users[id].description,
            participants: {
              [id]: users[id]
            }
            // TODO - conversation top right corner actions
          },
          conversation: messageConversations[id]
        }
      }

      // TODO group chat
      return {}
    }
  },
  methods: {}
}
</script>
