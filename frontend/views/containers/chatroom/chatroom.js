import { chatRoomTypes } from '@model/contracts/constants.js'

/**
 * TODO: need to remove this fakeMessages later
 * At this moment, just used the examples of identityContractIDs
**/
const fakeMessages = [
  // {
  //   time: (new Date(2020, 5, 22, 11, 43, 42): Date),
  //   from: '21XWnNHCSA1fRMdfy59qA3rw5wUqEx2dqYpu1o3mFuEycVqbyS',
  //   text: 'Hi 👋'
  // },
  // {
  //   time: (new Date(2020, 7, 23, 11, 34, 42): Date),
  //   from: '21XWnNWhTiaF7kGmj2yTEEJPUaCbBJSTdJZNaPCjmZqC8QzLci',
  //   text: 'It’s missing Sandy'
  // },
  // {
  //   time: (new Date(2020, 7, 23, 12, 23, 42): Date),
  //   from: '21XWnNHCSA1fRMdfy59qA3rw5wUqEx2dqYpu1o3mFuEycVqbyS',
  //   text: 'Yeah, looking for her username, one second'
  // },
  // {
  //   time: (new Date(2020, 7, 30, 13, 25, 42): Date),
  //   from: '21XWnNMWqf3Wbf5tavSJascMXWznrucYvJYDP6YsRxmQs63F4j',
  //   text: 'Guys, should we add Katty to the group?'
  // },
  // {
  //   time: (new Date(2020, 7, 31, 14, 28, 42): Date),
  //   from: '21XWnNWhTiaF7kGmj2yTEEJPUaCbBJSTdJZNaPCjmZqC8QzLci',
  //   text: 'There’s no problem to me',
  //   unread: true,
  //   emoticons: {
  //     '💖': ['21XWnNHCSA1fRMdfy59qA3rw5wUqEx2dqYpu1o3mFuEycVqbyS']
  //   }
  // }
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
    currentChatRoomUsers (): Object {
      return this.$store.getters['chatRoomUsers']
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
    isJoinedChatRoom (): function {
      return (chatRoomId: string): boolean => this.$store.getters['isJoinedChatRoom'](chatRoomId)
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
        editable: this.currentChatRoomState.attributes.editable,
        joined: this.isJoinedChatRoom(this.currentChatRoomId),
        picture: this.currentChatRoomState.attributes.picture
      }
    },
    details (): Object {
      // participants should be the members who joined at least once, even they have leaved at the moment
      return {
        isLoading: false,
        conversation: fakeMessages,
        participants: this.currentChatRoomUsers
      }
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

      // Temporarily blocked the chatrooms which the user is not part of
      // Need to open it later and display messages just like Slack
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
