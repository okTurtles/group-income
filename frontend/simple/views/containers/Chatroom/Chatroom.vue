<template>
  <main class="c-chatroom">
    <chat-nav :title="title" :searchPlaceholder="searchPlaceholder">
      <slot name="nav"></slot>
    </chat-nav>
    <chat-main :summary="summary" :details="details" />
  </main>
</template>
<style lang="scss" scoped>
@import "../../../assets/sass/theme/index";

.c-chatroom {
  padding: 0;

  @include phone {
    display: block;
    min-height: auto;
  }

  @include phablet {
    flex-direction: row;
    align-items: stretch;
    height: 100vh;
  }
}
</style>
<script>
import { groupA, privateMessagesSortedByTime, users, messageConversations } from './fakeStore.js'
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
    return {
      config: {
        isPhone: null
      },
      ephemeral: {
        isLoading: true
      }
    }
  },
  created () {
    // TODO #492 create a global Vue Responsive just for media queries.
    var mediaIsPhone = window.matchMedia('screen and (max-width: 639px)')
    this.config.isPhone = mediaIsPhone.matches
    mediaIsPhone.onchange = (e) => { this.config.isPhone = e.matches }
  },
  computed: {
    currentConversation () {
      // NOTE - This should be $store responsability but for now
      // I've used the $route just for static mocked layout purposes for messages

      let currentId

      // TODO ALL OF THIS...

      if (this.$route.name === 'Messages' && !this.config.isPhone) {
        // Open by default the first conversation without unread messages
        for (let i = 0, l = privateMessagesSortedByTime.length; i < l; i++) {
          if (users[privateMessagesSortedByTime[i]].unreadCount === 0) {
            currentId = privateMessagesSortedByTime[i]
            break
          }
        }

        this.$router.push({ path: `/messages/${users[currentId].name}` })
        this.$route.params.currentConversation = { type: 'messages', id: currentId }
      } else if (this.$route.name === 'MessagesConversation') {
        if (this.$route.params.currentConversation) {
          return this.$route.params.currentConversation
        }

        currentId = Object.keys(users).find(user => users[user].name === this.$route.params.name)
        this.$route.params.currentConversation = { type: 'messages', id: currentId }
      } else if (this.$route.name === 'GroupChat' && !this.config.isPhone) {
        // Open by default the lounge channel
        const currentId = 'c0'

        this.$router.push({ path: `/group-chat/${groupA.channels[currentId].name}` })
        this.$route.params.currentConversation = { type: 'groupChat', id: currentId }
      } else if (this.$route.name === 'GroupChatConversation') {
        if (this.$route.params.currentConversation) {
          return this.$route.params.currentConversation
        }

        currentId = Object.keys(groupA.channels).find(user => groupA.channels[user].name === this.$route.params.name)

        if (!currentId) {
          currentId = Object.keys(users).find(user => users[user].name === this.$route.params.name)
          this.$route.params.currentConversation = { type: 'messages', id: currentId }
        } else {
          this.$route.params.currentConversation = { type: 'groupChat', id: currentId }
        }
      }

      return this.$route.params.currentConversation || {}
    },
    summary () {
      const { type, id } = this.currentConversation
      const list = type === 'messages' ? users : groupA.channels

      if (!id) {
        return {}
      }

      // BUG/REVIEW - Can I set the title with vue-router? There's a small time interval
      // between when the route changes (title undefined) and update it with the actual title
      document.title = list[id].displayName || list[id].name

      return {
        type,
        title: list[id].displayName || list[id].name,
        description: list[id].description
      }
    },
    details () {
      const { id, type } = this.currentConversation
      const conversation = type === 'messages' ? messageConversations : groupA.conversations
      const participants = type === 'messages'
        ? { [id]: users[id] }
        : { 333: users['333'], 444: users['444'], 111: users['111'] } // TODO dynamic

      return {
        isLoading: false,
        conversation: conversation[id],
        participants
      }
    }
  }
}
</script>
