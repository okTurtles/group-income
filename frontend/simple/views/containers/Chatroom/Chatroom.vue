<template>
  <!-- TODO is this component real needed?! -->
  <main class="c-chatroom">
    <chat-nav :title="title" :searchPlaceholder="searchPlaceholder" @search="$emit('search')">
      <slot></slot>
    </chat-nav>
    <!-- TODO - design loading state when conversation is being loaded  -->
    <chat-main :info="chatData.info" :conversation="chatData.conversation" />
  </main>
</template>
<style lang="scss" scoped>
@import "../../../assets/sass/theme/index";

.c-chatroom {
  padding: 0;
  display: block;

  @include tablet {
    display: flex;
    flex-direction: row;
    align-items: stretch;
    height: 100vh;
  }
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
    searchPlaceholder: String
  },
  data () {
    return {}
  },
  computed: {
    currentConversation () {
      // OPTIMIZE/REVIEW - This should be $store responsability but for now
      // I've used the $route just for static mocked layout purposes
      if (!this.$route.params.name) { return {} }

      if (!this.$route.params.currentConversation) {
        this.$route.params.currentConversation = {
          type: 'messages',
          id: Object.keys(users).find(user => users[user].name === this.$route.params.name)
        }
      }

      return this.$route.params.currentConversation
    },
    chatData () {
      const { type, id } = this.currentConversation

      if (type === 'messages') {
        // REVIEW/BUG - How do I do this with vue-router? There's a small time interval
        // between when the route changes (title undefined) and update it with the actual title
        document.title = users[id].displayName || users[id].name

        console.log('retorna?')
        return {
          info: {
            type,
            title: users[id].displayName || users[id].name,
            description: users[id].description,
            participants: {
              [id]: users[id]
            }
            // TODO - Also send the conversation's actions at top right corner?
          },
          conversation: messageConversations[id]
        }
      }

      console.log('retorna:', type)

      // TODO group chat
      return {}

      // REVIEW/TODO - where should the conversation unread state be updated?
    }
  },
  methods: {}
}
</script>
