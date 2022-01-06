import { chatRoomTypes } from '@model/contracts/constants.js'

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
    currentIdentityContractId (): string {
      return this.$store.state.loggedIn.identityContractID
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
      return {
        isLoading: false,
        conversation: {},
        participants: this.currentChatRoomState.users || {}
      }
    },
    isJoinedChatRoom (): boolean {
      return chatRoomId => !!this.$store.state.contracts[chatRoomId] &&
        !!this.$store.state[chatRoomId].users[this.currentIdentityContractId]
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
