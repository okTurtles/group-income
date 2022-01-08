import { chatRoomTypes, messageTypes } from '@model/contracts/constants.js'

const fakeMessages = [
  {
    time: (new Date(2020, 5, 22, 11, 43, 42): Date),
    from: '21XWnNTQGFZaeK8SwrAe5FZ9LtWbK1bNdMqF2ai4FJeJRVYAbu',
    text: 'Hi 👋'
  },
  {
    time: (new Date(2020, 7, 23, 11, 34, 42): Date),
    from: '21XWnNVjz6rjPc28X3XWbHJM3ZdDEE8hb3abGZx47gjazaG2XJ',
    text: 'It’s missing Sandy'
  },
  {
    time: (new Date(2020, 7, 23, 12, 23, 42): Date),
    from: '21XWnNTQGFZaeK8SwrAe5FZ9LtWbK1bNdMqF2ai4FJeJRVYAbu',
    text: 'Yeah, looking for her username, one second'
  },
  {
    time: (new Date(2020, 7, 23, 12, 45, 42): Date),
    from: messageTypes.NOTIFICATION,
    id: 'youAddedToDreamersGroup',
    text: 'You are now part of The Dreamers group.'
  },
  {
    time: (new Date(2020, 7, 30, 13, 25, 42): Date),
    from: '21XWnNTQGFZaeK8SwrAe5FZ9LtWbK1bNdMqF2ai4FJeJRVYAbu',
    text: 'Guys, should we add Katty to the group?'
  },
  {
    time: (new Date(2020, 7, 31, 14, 28, 42): Date),
    from: '21XWnNVjz6rjPc28X3XWbHJM3ZdDEE8hb3abGZx47gjazaG2XJ',
    text: 'There’s no problem to me',
    unread: true,
    emoticons: {
      '💖': ['21XWnNTQGFZaeK8SwrAe5FZ9LtWbK1bNdMqF2ai4FJeJRVYAbu']
    }
  }
]

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

    /**
     * TODO
     * show toast or dialog that the chatRoomId in URL is not incorrect or that is not-yet-joined chatRoomId
    **/
    if (!this.$route.params.chatRoomId || !this.isJoinedChatRoom(this.$route.params.chatRoomId)) {
      this.redirectChat('GroupChatConversation')
    } else {
      this.refreshTitle()
    }
  },
  computed: {
    currentChatRoomState (): Object {
      return this.$store.getters['currentChatRoomState']
    },
    currentChatRoomId (): string {
      return this.$store.state['currentChatRoomId']
    },
    generalChatRoomId (): string {
      return this.$store.getters['getGeneralChatRoomID']
    },
    chatRoomsInDetail (): Object {
      return this.$store.getters['getChatRoomsInDetail']
    },
    summary (): Object {
      if (!this.currentChatRoomState || !this.currentChatRoomState.attributes) {
        return {}
      }
      const title = this.currentChatRoomState.attributes.name
      const type = this.currentChatRoomState.attributes.type

      return {
        type,
        title,
        description: this.currentChatRoomState.attributes.description,
        routerBack: type === chatRoomTypes.INDIVIDUAL ? '/messages' : '/group-chat',
        private: this.currentChatRoomState.attributes.private,
        picture: this.currentChatRoomState.attributes.picture
      }
    },
    details (): Object {
      const participants = this.currentChatRoomState.users || {}
      for (const identityContractID in participants) {
        participants[identityContractID] = {
          ...participants[identityContractID],
          ...this.$store.state[identityContractID].attributes
        }
      }
      return {
        isLoading: false,
        conversation: fakeMessages,
        participants
      }
    },
    isJoinedChatRoom (): boolean {
      return chatRoomId => this.chatRoomsInDetail[chatRoomId].joined
    }
  },
  methods: {
    redirectChat (name: string, chatRoomId: string, shouldReload: boolean) {
      // NOTE: Vue re-renders the components when the query changes
      // Force to do it too again after each consecutive reload
      const query = {
        ...this.$route.query
      }
      const reload = Number(this.$route.query.reload)
      if (shouldReload) query.reload = reload ? reload + 1 : 1

      chatRoomId = chatRoomId || (this.isJoinedChatRoom(this.currentChatRoomId) ? this.currentChatRoomId : this.generalChatRoomId)

      this.$router.push({
        name,
        params: { chatRoomId },
        query
      })
    },
    refreshTitle (): void {
      document.title = this.currentChatRoomState.attributes.name
    }
  }
}

export default chatroom
