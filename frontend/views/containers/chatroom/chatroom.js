import { chatTypes, individualMessagesSorted, users, individualConversations, groupA } from './fakeStore.js'

const chatroom = {
  data (): Object {
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
    const mediaIsPhone = window.matchMedia('screen and (max-width: 639px)')
    this.config.isPhone = mediaIsPhone.matches
    mediaIsPhone.onchange = (e) => { this.config.isPhone = e.matches }
  },
  computed: {
    currentConversation (): Object {
      // NOTE - This should be $store responsability but for now
      // I've used the $route just for static mocked layout purposes
      if (this.$route.params.currentConversation) {
        return this.$route.params.currentConversation
      }

      let currentId = null
      let shouldRefresh = true

      switch (this.$route.name) {
        case 'Messages':
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
        case 'GroupChat': {
          // Open by default the lounge channel id
          currentId = 'c0'
          shouldRefresh = false
          const chatName = groupA.channels[currentId].name
          const chatType = chatTypes.GROUP

          this.redirectChat('GroupChatConversation', chatName, chatType, currentId, shouldRefresh)
          break
        }
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
    summary (): Object {
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
    details (): Object {
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
    findUserId (): string | void {
      return Object.keys(users).find(user => users[user].name === this.$route.params.chatName)
    },
    findGroupId (): string | void {
      return Object.keys(groupA.channels).find(user => groupA.channels[user].name === this.$route.params.chatName)
    },
    redirectChat (name: string, chatName: string, type: string, id: string, shouldReload: boolean) {
      // NOTE: Vue re-renders the components when the query changes
      // Force to do it too again after each consecutive reload
      const query = {
        ...this.$route.query
      }
      const reload = Number(this.$route.query.reload)
      if (shouldReload) query.reload = reload ? reload + 1 : 1
      this.$router.push({
        name,
        params: {
          chatName,
          currentConversation: { type, id }
        },
        query
      })
    }
  }
}

export default chatroom
