<template>
  <main class="c-chatroom">
    <chat-nav :title="title">
      <slot></slot>
    </chat-nav>
    <!-- TODO/REVIEW - design loading state when conversation is being loaded  -->
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
      // TODO: populate view with currentConversation when $route.params are empty
      // REVIEW - This should be $store responsability but for now (layout purposes) let's keep it on the $route

      const { type, id } = this.$route.params.currentConversation || {}

      console.log('currentConversationId', { id, type })

      if (type === 'messages') {
        // REVIEW/BUG - How do I do this with vue-router? There's a small time interval
        // between changing the route (title undefined) and update with the actual title
        document.title = users[id].displayName || users[id].name

        return {
          info: {
            type,
            title: users[id].displayName || users[id].name,
            description: users[id].description,
            participants: {
              [id]: users[id]
            }
            // TODO - what are the conversation's actions at top right corner?
          },
          conversation: messageConversations[id]
        }
      }

      // TODO group chat
      return {}

      // REVIEW/TODO - where should the conversation unread state be updated?
    }
  },
  methods: {}
}
</script>
