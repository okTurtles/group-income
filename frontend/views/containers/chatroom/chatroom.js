import { mapGetters, mapState } from 'vuex'
import sbp from '~/shared/sbp.js'
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

const chatroom: Object = {
  data (): Object {
    return {
      config: {
        isPhone: null
      },
      ephemeral: {
        isLoading: true,
        loadedSummary: null,
        loadedDetails: null
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
    const { chatRoomId } = this.$route.params
    if (!chatRoomId) {
      this.ephemeral.loadedSummary = null
      this.redirectChat('GroupChatConversation')
    } else if (!this.isJoinedChatRoom(chatRoomId)) {
      if (!this.isPublicChatRoom(chatRoomId)) {
        this.ephemeral.loadedSummary = null
        this.redirectChat('GroupChatConversation')
      } else {
        this.loadSummary()
      }
    } else {
      this.refreshTitle()
    }
  },
  computed: {
    ...mapGetters([
      'currentChatRoomState',
      'chatRoomUsers',
      'chatRoomUsersInSort',
      'generalChatRoomId',
      'groupMembersSorted',
      'groupProfiles',
      'chatRoomsInDetail'
    ]),
    ...mapState([
      'currentChatRoomId'
    ]),
    isJoinedChatRoom (): function {
      return (chatRoomId: string): boolean => this.$store.getters['isJoinedChatRoom'](chatRoomId)
    },
    isPublicChatRoom (): function {
      return (chatRoomId: string): boolean => this.$store.getters['isPublicChatRoom'](chatRoomId)
    },
    summary (): Object {
      if (!this.isJoinedChatRoom(this.currentChatRoomId)) {
        return this.ephemeral.loadedSummary || {}
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
        joined: true,
        picture: this.currentChatRoomState.attributes.picture
      }
    },
    details (): Object {
      // participants should be the members who joined at least once, even they have leaved at the moment
      if (!this.isJoinedChatRoom(this.currentChatRoomId)) {
        return this.ephemeral.loadedDetails || {}
      }
      return {
        isLoading: false,
        conversation: fakeMessages,
        participantsInSort: this.chatRoomUsersInSort,
        participants: this.chatRoomUsers
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
    refreshTitle (title?: string): void {
      title = title || this.currentChatRoomState.attributes?.name
      if (title) {
        document.title = title
      }
    },
    async loadSummary (): Promise<void> {
      const { chatRoomId } = this.$route.params
      const state = await sbp('state/latestContractState', chatRoomId)
      const title = state.attributes.name
      const type = state.attributes.type

      this.ephemeral.loadedSummary = {
        type,
        title,
        description: state.attributes.description,
        routerBack: type === chatRoomTypes.INDIVIDUAL ? '/messages' : '/group-chat',
        private: state.attributes.private,
        editable: state.attributes.editable,
        joined: false,
        picture: state.attributes.picture
      }
      const participantsInSort = this.groupMembersSorted.map(member => member.username)
        .filter(username => !!state.users[username] && !state.users[username].departedDate) || []
      this.ephemeral.loadedDetails = {
        isLoading: false,
        conversation: fakeMessages,
        participantsInSort,
        participants: state.users
      }
      this.refreshTitle(title)
    }
  }
}

export default chatroom
