import { chatTypes, individualMessagesSorted, users, individualConversations, groupA } from './fakeStore.js'

const chatroom = {
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
      // I've used the $route just for static mocked layout purposes

      if (this.$route.params.currentConversation) {
        return this.$route.params.currentConversation
      }

      let currentId = null
      let shouldRefresh = true

      switch (this.$route.name) {
        case 'Messages':
          if (this.config.isPhone) {
            break
          }

          // Open by default the first conversation without unread messages
          for (let i = 0, l = individualMessagesSorted.length; i < l; i++) {
            if (users[individualMessagesSorted[i]].unreadCount === 0) {
              currentId = individualMessagesSorted[i]
              break
            }
          }
          shouldRefresh = false
          // fall through
        case 'MessagesConversation':
          currentId = currentId || this.findUserId()
          this.redirectChat('MessagesConversation', users[currentId].name, chatTypes.INDIVIDUAL, currentId, shouldRefresh)
          break
        case 'GroupChat':
          if (this.config.isPhone) {
            break
          }

          // Open by default the lounge channel id
          currentId = 'c0'
          shouldRefresh = false
          // fall through
        case 'GroupChatConversation': {
          const groupId = currentId || this.findGroupId()
          currentId = groupId || this.findUserId()
          const newChatName = groupId ? groupA.channels[currentId].name : users[currentId].name
          const chatType = groupId ? chatTypes.GROUP : chatTypes.INDIVIDUAL

          this.redirectChat('GroupChatConversation', newChatName, chatType, currentId, shouldRefresh)
          break
        }
        default:
          break
      }

      return this.$route.params.currentConversation || {}
    },
    summary () {
      const { type, id } = this.currentConversation

      if (!type || !id) { return {} }

      const chatList = type === chatTypes.INDIVIDUAL ? users : groupA.channels
      const routerBack = type === chatTypes.INDIVIDUAL ? '/messages' : '/group-chat'
      const title = chatList[id].displayName || chatList[id].name

      // BUG/REVIEW - Can I set the title with vue-router? There's a small time interval
      // between when the route changes (title undefined) and update it with the actual title
      document.title = title

      return {
        type,
        title,
        description: chatList[id].description,
        routerBack,
        private: chatList[id].private,
        picture: chatList[id].picture
      }
    },
    details () {
      const { id, type } = this.currentConversation
      const conversation = type === chatTypes.INDIVIDUAL ? individualConversations : groupA.conversations
      const participants = type === chatTypes.INDIVIDUAL
        ? { [id]: users[id] }
        : users // NOTE/TODO - filter by users of this group only

      return {
        isLoading: false,
        conversation: conversation[id],
        participants
      }
    }
  },
  methods: {
    findUserId () {
      return Object.keys(users).find(user => users[user].name === this.$route.params.chatName)
    },
    findGroupId () {
      return Object.keys(groupA.channels).find(user => groupA.channels[user].name === this.$route.params.chatName)
    },
    redirectChat (name, chatName, type, id, shouldReload) {
      // NOTE: Vue re-renders the components when the query changes
      // Force to do it too again after each consecutive reload
      const reload = shouldReload ? { reload: Number(this.$route.query.reload) ? Number(this.$route.query.reload) + 1 : 1 } : {}
      this.$router.push({
        name,
        params: {
          chatName,
          currentConversation: { type, id }
        },
        query: {
          ...reload
        }
      })
    }
  }
}

export default chatroom
