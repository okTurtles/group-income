import sbp from '@sbp/sbp'
import { mapGetters, mapState } from 'vuex'
import {
  CHATROOM_TYPES,
  CHATROOM_PRIVACY_LEVEL,
  CHATROOM_DETAILS_UPDATED
} from '@model/contracts/shared/constants.js'
import { logExceptNavigationDuplicated } from '@view-utils/misc.js'

const initChatChannelDetails = {
  isLoading: true,
  numberOfParticipants: 0,
  participants: []
}

const ChatMixin: Object = {
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
      'ourContactProfiles',
      'isDirectMessage',
      'isPrivateDirectMessage',
      'isGroupDirectMessage',
      'usernameFromDirectMessageID',
      'groupDirectMessageInfo'
    ]),
    ...mapState(['currentGroupId']),
    summary (): Object {
      if (!this.isJoinedChatRoom(this.currentChatRoomId)) {
        const joined = sbp('chelonia/contract/isSyncing', this.currentChatRoomId)
        // NOTE: not sure when this.ephemeral.loadedSummary is null and joined is true
        // need to debug and determine `archived` in that case
        // since `archived` field is used when `joined` is true
        return Object.assign(this.ephemeral.loadedSummary || {}, { joined })
      }

      const { name, type, description, creator, privacyLevel } = this.currentChatRoomState.attributes

      let title = name
      let picture
      if (this.isPrivateDirectMessage(this.currentChatRoomId)) {
        const partnerUsername = this.usernameFromDirectMessageID(this.currentChatRoomId)
        const partner = this.ourContactProfiles[partnerUsername]
        title = partner?.displayName || partnerUsername
        picture = partner?.picture
      } else if (this.isGroupDirectMessage(this.currentChatRoomId)) {
        title = this.groupDirectMessageInfo(this.currentChatRoomId).title
      }
      // NOTE: archived doesn't work for DMs
      const archived = type !== CHATROOM_TYPES.INDIVIDUAL && !this.isJoinedChatRoom(this.currentChatRoomId, creator)

      return {
        type,
        title,
        description,
        private: privacyLevel === CHATROOM_PRIVACY_LEVEL.PRIVATE,
        privacyLevel,
        general: this.generalChatRoomId === this.currentChatRoomId,
        joined: true,
        archived,
        picture,
        creator
      }
    },
    details (): Object {
      // participants should be the members who joined at least once, even they have leaved at the moment
      if (!this.isJoinedChatRoom(this.currentChatRoomId)) {
        return this.ephemeral.loadedDetails || {}
      }
      const participants = {}

      if (this.isDirectMessage()) {
        const numberOfParticipants = Object.keys(this.currentChatRoomState.users).length
        for (const username of Object.keys(this.currentChatRoomState.users)) {
          participants[username] = this.ourContactProfiles[username]
        }
        return {
          isLoading: false,
          numberOfParticipants, // TODO: Need to consider guests
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
      if (!title) {
        if (this.isPrivateDirectMessage(this.currentChatRoomId)) {
          const partnerUsername = this.usernameFromDirectMessageID(this.currentChatRoomId)
          const partner = this.ourContactProfiles[partnerUsername]
          title = partner.displayName || partnerUsername
        } else if (this.isGroupDirectMessage(this.currentChatRoomId)) {
          title = this.groupDirectMessageInfo(this.currentChatRoomId).title
        } else {
          title = this.summary.title
        }
      }

      if (title) {
        document.title = title
      }
    },
    async loadSummaryAndDetails (): Promise<void> {
      this.ephemeral.loadedDetails = initChatChannelDetails
      const { chatRoomId } = this.$route.params
      let state
      try {
        // NOTE: it could be failed to get the latest contract state
        // when the chatRoomId is incorrect [e.g. chatRoomId = 1234]
        state = await sbp('chelonia/latestContractState', chatRoomId)
      } catch (e) {
        this.$router.push({ path: '/dashboard' }).catch(console.warn)
        return
      }
      const { name, type, description, creator, privacyLevel } = state.attributes
      // NOTE: archived doesn't work for DMs
      const archived = type !== CHATROOM_TYPES.INDIVIDUAL && !state.users[creator]

      this.ephemeral.loadedSummary = {
        type,
        title: name,
        description,
        private: state.attributes.privacyLevel === CHATROOM_PRIVACY_LEVEL.PRIVATE,
        privacyLevel,
        joined: false,
        archived,
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
      if (!this.isJoinedChatRoom(this.currentChatRoomId) && !this.isDirectMessage()) {
        sbp('okTurtles.data/set', 'GROUPCHAT_DETAILS', {
          participants: Object.keys(this.details.members || {})
            .map(un => ({ username: un, displayName: this.details.members[un].displayName })),
          name: this.summary.title,
          description: this.summary.description,
          privacyLevel: this.summary.privacyLevel
        })
        // TODO: need to remove 'GROUPCHAT_DETAILS' when no longer needed
        sbp('okTurtles.events/emit', CHATROOM_DETAILS_UPDATED)
      }
    },
    updateCurrentChatRoomID (chatRoomId: string) {
      if (this.isDirectMessage(chatRoomId)) {
        sbp('state/vuex/commit', 'setCurrentChatRoomId', { chatRoomId })
      } else if (chatRoomId && chatRoomId !== this.currentChatRoomId) {
        const groupID = this.groupIdFromChatRoomId(chatRoomId)
        // NOTE: groupID could be undefined when the chatRoomId is incorrect
        if (groupID) {
          if (this.currentGroupId !== groupID) {
            sbp('state/vuex/commit', 'setCurrentGroupId', groupID)
          }
          sbp('state/vuex/commit', 'setCurrentChatRoomId', { chatRoomId })
        }
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

export default ChatMixin
