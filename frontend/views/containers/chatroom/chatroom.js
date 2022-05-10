import sbp from '@sbp/sbp'
import { mapGetters } from 'vuex'
import { CHATROOM_TYPES, CHATROOM_PRIVACY_LEVEL } from '@model/contracts/constants.js'
import { logExceptNavigationDuplicated } from '@view-utils/misc.js'
import { CHATROOM_DETAILS_UPDATED } from '~/frontend/utils/events.js'

const initChatChannelDetails = {
  isLoading: true,
  numberOfParticipants: 0,
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
  },
  computed: {
    ...mapGetters([
      'currentChatRoomId',
      'currentChatRoomState',
      'currentGroupState',
      'chatRoomUsers',
      'generalChatRoomId',
      'globalProfile',
      'isJoinedChatRoom',
      'isPrivateChatRoom'
    ]),
    summary (): Object {
      if (!this.isJoinedChatRoom(this.currentChatRoomId)) {
        const joiningChatRoom = sbp('okTurtles.data/get', 'JOINING_CHATROOM')
        return joiningChatRoom ? { ...this.ephemeral.loadedSummary, joined: true } : this.ephemeral.loadedSummary || {}
      }

      const { name, type, description, creator, picture, privacyLevel } = this.currentChatRoomState.attributes

      return {
        type,
        title: name,
        description,
        routerBack: type === CHATROOM_TYPES.INDIVIDUAL ? '/messages' : '/group-chat',
        private: this.currentChatRoomState.attributes.privacyLevel === CHATROOM_PRIVACY_LEVEL.PRIVATE,
        privacyLevel,
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
      const { name, type, description, picture, creator, privacyLevel } = state.attributes

      this.ephemeral.loadedSummary = {
        type,
        title: name,
        description,
        routerBack: type === CHATROOM_TYPES.INDIVIDUAL ? '/messages' : '/group-chat',
        private: state.attributes.privacyLevel === CHATROOM_PRIVACY_LEVEL.PRIVATE,
        privacyLevel,
        joined: false,
        picture,
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
      if (!this.isJoinedChatRoom(this.currentChatRoomId)) {
        sbp('okTurtles.data/set', 'GROUPCHAT_DETAILS', {
          participants: Object.keys(this.details.members || {})
            .map(un => ({ username: un, displayName: this.details.members[un].displayName })),
          name: this.summary.title,
          description: this.summary.description,
          privacyLevel: this.summary.privacyLevel
        })
        sbp('okTurtles.events/emit', CHATROOM_DETAILS_UPDATED)
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

export default chatroom
