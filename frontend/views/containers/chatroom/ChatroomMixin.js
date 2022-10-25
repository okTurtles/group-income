import sbp from '@sbp/sbp'
import { mapGetters, mapState } from 'vuex'
import { CHATROOM_TYPES, CHATROOM_PRIVACY_LEVEL, CHATROOM_DETAILS_UPDATED } from '@model/contracts/shared/constants.js'
import { logExceptNavigationDuplicated } from '@view-utils/misc.js'

const initChatChannelDetails = {
  isLoading: true,
  numberOfParticipants: 0,
  participants: []
}

const ChatroomMixin: Object = {
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
      if (this.isPrivateChatRoom(chatRoomId)) {
        this.ephemeral.loadedSummary = null
        this.redirectChat('GroupChatConversation')
      } else {
        this.loadSummaryAndDetails()
      }
    } else {
      this.refreshTitle()
    }
  },
  mounted () {
    this.setGroupChatDetailsAsGlobal()
    this.updateCurrentChatRoomID(this.$route.params.chatRoomId)
  },
  computed: {
    ...mapGetters([
      'currentChatRoomId',
      'currentChatRoomState',
      'currentGroupState',
      'groupIdFromChatRoomId',
      'chatRoomUsers',
      'generalChatRoomId',
      'globalProfile',
      'isJoinedChatRoom',
      'isPrivateChatRoom',
      'ourContacts',
      'isDirectMessage',
      'mailboxContract',
      'ourUsername'
    ]),
    ...mapState(['currentGroupId']),
    summary (): Object {
      if (!this.isJoinedChatRoom(this.currentChatRoomId)) {
        const joiningChatRoomId = sbp('okTurtles.data/get', 'JOINING_CHATROOM_ID')
        return !joiningChatRoomId
          ? this.ephemeral.loadedSummary || {}
          : { ...this.ephemeral.loadedSummary, joined: joiningChatRoomId === this.currentChatRoomId }
      }

      const { name, type, description, creator, privacyLevel } = this.currentChatRoomState.attributes

      // partner is only for direct message
      let partner
      if (this.isDirectMessage(this.currentChatRoomId)) {
        const partnerUsername = Object.keys(this.mailboxContract.users)
          .find(username => this.mailboxContract.users[username].contractID === this.currentChatRoomId)
        partner = this.ourContacts.find(contact => contact.username === partnerUsername)
      }

      return {
        type,
        title: type === CHATROOM_TYPES.INDIVIDUAL && partner ? partner.displayName : name,
        description,
        private: this.currentChatRoomState.attributes.privacyLevel === CHATROOM_PRIVACY_LEVEL.PRIVATE,
        privacyLevel,
        general: this.generalChatRoomId === this.currentChatRoomId,
        joined: true,
        picture: type === CHATROOM_TYPES.INDIVIDUAL && partner ? partner.picture : undefined,
        creator
      }
    },
    details (): Object {
      // participants should be the members who joined at least once, even they have leaved at the moment
      if (!this.isJoinedChatRoom(this.currentChatRoomId)) {
        return this.ephemeral.loadedDetails || {}
      }
      const participants = {}

      if (this.isDirectMessage(this.currentChatRoomId)) {
        for (const username of Object.keys(this.currentChatRoomState.users)) {
          if (username === this.ourUsername) {
            participants[username] = this.globalProfile(username)
          } else {
            participants[username] = this.ourContacts.find(contact => contact.username === username)
          }
        }
        return {
          isLoading: false,
          numberOfParticipants: 1, // TODO: Need to consider guests
          participants
        }
      }
      for (const username in this.currentGroupState.profiles) {
        // need to consider the time when someone is joining
        // here, his identity contract is not synced yet,
        // but `General` chatroom contract is already synced,
        // that's why need to init with empty json object
        const { displayName, picture, email } = this.globalProfile(username) || {}
        participants[username] = {
          ...this.chatRoomUsers[username],
          username: username || '',
          displayName: displayName || '',
          picture: picture || '',
          email: email || ''
        }
      }
      return {
        isLoading: false,
        numberOfParticipants: Object.keys(this.chatRoomUsers).length,
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
      }).catch(logExceptNavigationDuplicated)
    },
    refreshTitle (title?: string): void {
      title = title || this.currentChatRoomState.attributes?.name
      if (title) {
        document.title = title
      }
    },
    async loadSummaryAndDetails (): Promise<void> {
      this.ephemeral.loadedDetails = initChatChannelDetails
      const { chatRoomId } = this.$route.params
      const state = await sbp('chelonia/latestContractState', chatRoomId)
      const { name, type, description, creator, privacyLevel } = state.attributes

      this.ephemeral.loadedSummary = {
        type,
        title: name,
        description,
        private: state.attributes.privacyLevel === CHATROOM_PRIVACY_LEVEL.PRIVATE,
        privacyLevel,
        joined: false,
        creator
      }

      const participants = {}
      const members = {}
      for (const username in this.currentGroupState.profiles) {
        const { displayName, picture, email } = this.globalProfile(username) || {}
        participants[username] = {
          ...state.users[username],
          username: username || '',
          displayName: displayName || '',
          picture: picture || '',
          email: email || ''
        }
        if (state.users[username]) {
          members[username] = { username, displayName, picture, email }
        }
      }
      this.ephemeral.loadedDetails = {
        isLoading: false,
        numberOfParticipants: Object.keys(state.users).length,
        participants,
        members
      }
      this.refreshTitle(name)
      this.setGroupChatDetailsAsGlobal()
    },
    setGroupChatDetailsAsGlobal () {
      if (!this.isJoinedChatRoom(this.currentChatRoomId) && !this.isDirectMessage(this.currentChatRoomId)) {
        sbp('okTurtles.data/set', 'GROUPCHAT_DETAILS', {
          participants: Object.keys(this.details.members || {})
            .map(un => ({ username: un, displayName: this.details.members[un].displayName })),
          name: this.summary.title,
          description: this.summary.description,
          privacyLevel: this.summary.privacyLevel
        })
        sbp('okTurtles.events/emit', CHATROOM_DETAILS_UPDATED)
      }
    },
    updateCurrentChatRoomID (chatRoomId: string) {
      if (this.isDirectMessage(chatRoomId)) {
        sbp('state/vuex/commit', 'setCurrentChatRoomId', { chatRoomId })
      } else if (chatRoomId && chatRoomId !== this.currentChatRoomId) {
        const groupID = this.groupIdFromChatRoomId(chatRoomId)
        if (this.currentGroupId !== groupID) {
          sbp('state/vuex/commit', 'setCurrentGroupId', groupID)
        }
        sbp('state/vuex/commit', 'setCurrentChatRoomId', { chatRoomId })
      }
    }
  },
  watch: {
    'currentChatRoomId' (to: string, from: string) {
      if (to) {
        this.redirectChat('GroupChatConversation', to)
        this.$nextTick(() => {
          this.setGroupChatDetailsAsGlobal()
        })
      }
    }
  }
}

export default ChatroomMixin
