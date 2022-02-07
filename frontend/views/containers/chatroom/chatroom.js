import { mapGetters, mapState } from 'vuex'
import sbp from '~/shared/sbp.js'
import { CHATROOM_TYPES } from '@model/contracts/constants.js'
import { CHATROOM_STATE_LOADED } from '~/frontend/utils/events.js'

/**
 * TODO: need to remove this fakeMessages later
 * At this moment, just used the examples of identityContractIDs
**/

const initChatChannelDetails = {
  isLoading: true,
  participantsInSort: [],
  participants: []
}

const chatroom: Object = {
  data (): Object {
    return {
      config: {
        isPhone: null
      },
      ephemeral: {
        isLoading: true,
        loadedSummary: null,
        loadedDetails: initChatChannelDetails
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
      'globalProfile',
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

      const { name, type, description, creator, picture } = this.currentChatRoomState.attributes

      return {
        type,
        title: name,
        description,
        routerBack: type === CHATROOM_TYPES.INDIVIDUAL ? '/messages' : '/group-chat',
        private: this.currentChatRoomState.attributes.private,
        general: this.generalChatRoomId === this.currentChatRoomId,
        joined: true,
        creator,
        picture
      }
    },
    details (): Object {
      // participants should be the members who joined at least once, even they have leaved at the moment
      if (!this.isJoinedChatRoom(this.currentChatRoomId)) {
        return this.ephemeral.loadedDetails || {}
      }
      const participants = {}
      for (const username in this.chatRoomUsers) {
        const { displayName, picture, email } = this.globalProfile(username)
        participants[username] = {
          ...this.chatRoomUsers[username],
          username,
          displayName,
          picture,
          email
        }
      }
      return {
        isLoading: false,
        participantsInSort: this.chatRoomUsersInSort,
        participants
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
      this.ephemeral.loadedDetails = initChatChannelDetails
      const { chatRoomId } = this.$route.params
      const state = await sbp('state/latestContractState', chatRoomId)
      const { name, type, description, picture, creator } = state.attributes

      this.ephemeral.loadedSummary = {
        type,
        title: name,
        description,
        routerBack: type === CHATROOM_TYPES.INDIVIDUAL ? '/messages' : '/group-chat',
        private: state.attributes.private,
        joined: false,
        picture,
        creator
      }
      const participantsInSort = this.groupMembersSorted.map(member => member.username)
        .filter(username => !!state.users[username]) || []

      const participants = {}
      for (const username in state.users) {
        const { displayName, picture, email } = this.globalProfile(username)
        participants[username] = {
          ...state.users[username],
          username,
          displayName,
          picture,
          email
        }
      }
      this.ephemeral.loadedDetails = {
        isLoading: false,
        participantsInSort,
        participants
      }
      sbp('okTurtles.events/emit', `${CHATROOM_STATE_LOADED}-${chatRoomId}`, state)
      this.refreshTitle(name)
    }
  }
}

export default chatroom
