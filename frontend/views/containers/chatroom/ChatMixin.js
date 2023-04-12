import sbp from '@sbp/sbp'
import { mapGetters, mapState } from 'vuex'
import { CHATROOM_PRIVACY_LEVEL } from '@model/contracts/shared/constants.js'
import { logExceptNavigationDuplicated } from '@view-utils/misc.js'

const initSummary = {
  title: '',
  picture: undefined,
  attributes: {},
  isPrivate: undefined,
  isGeneral: false,
  isJoined: false,
  isLoading: undefined,
  users: {},
  numberOfUsers: 0,
  participants: []
}

const ChatMixin: Object = {
  data (): Object {
    return {
      loadedSummary: initSummary
    }
  },
  mounted () {
    const { chatRoomId } = this.$route.params
    if (chatRoomId && this.isJoinedChatRoom(chatRoomId)) {
      this.refreshTitle()
      this.updateCurrentChatRoomID(chatRoomId)
    } else {
      this.redirectChat('GroupChatConversation')
    }
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
        const isJoined = sbp('chelonia/contract/isSyncing', this.currentChatRoomId)
        return Object.assign(this.loadedSummary, { isJoined })
      }

      let title = this.currentChatRoomState.attributes.name
      let picture
      if (this.isPrivateDirectMessage(this.currentChatRoomId)) {
        const partnerUsername = this.usernameFromDirectMessageID(this.currentChatRoomId)
        const partner = this.ourContactProfiles[partnerUsername]
        title = partner?.displayName || partnerUsername
        picture = partner?.picture
      } else if (this.isGroupDirectMessage(this.currentChatRoomId)) {
        title = this.groupDirectMessageInfo(this.currentChatRoomId).title
      }

      return {
        title,
        picture,
        attributes: Object.assign({}, this.currentChatRoomState.attributes),
        isPrivate: this.currentChatRoomState.attributes.privacyLevel === CHATROOM_PRIVACY_LEVEL.PRIVATE,
        isGeneral: this.generalChatRoomId === this.currentChatRoomId,
        isJoined: true,
        isLoading: false,
        users: Object.fromEntries(Object.keys(this.currentChatRoomState.users).map(username => {
          const { displayName, picture, email } = this.globalProfile(username) || {}
          return [username, { ...this.currentChatRoomState.users[username], displayName, picture, email }]
        })),
        numberOfUsers: Object.keys(this.currentChatRoomState.users).length,
        participants: this.ourContactProfiles // TODO: return only historical contributors
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
      document.title = title || this.summary.title
    },
    async loadLatestState (chatRoomId: string): Promise<void> {
      // TODO: init summary from getGroupChatRooms
      this.loadedSummary = { ...initSummary, isLoading: true }
      let state
      try {
        // NOTE: it could be failed to get the latest contract state
        //       when incorrect chatRoomId is passed [e.g. chatRoomId = '1234']
        // TODO: need to customize to loadLatestState
        //       in order to get the list of participants who contributed this chatroom contract
        state = await sbp('chelonia/latestContractState', chatRoomId)
      } catch (e) {
        // TODO: need to redirect to currentChatRoomId or generalChatRoomId
        return this.$router.push({ path: '/dashboard' }).catch(console.warn)
      }

      this.loadedSummary = {
        title: state.attributes.name,
        attributes: Object.assign({}, state.attributes),
        isPrivate: state.attributes.privacyLevel === CHATROOM_PRIVACY_LEVEL.PRIVATE,
        isGeneral: false,
        isJoined: false,
        isLoading: false,
        users: Object.fromEntries(Object.keys(state.users).map(username => {
          const { displayName, picture, email } = this.globalProfile(username) || {}
          return [username, { ...state.users[username], displayName, picture, email }]
        })), // current members
        numberOfUsers: Object.keys(state.users).length,
        participants: this.ourContactProfiles // TODO: return only historical contributors
      }
      this.refreshTitle(state.attributes.name)
    },
    updateCurrentChatRoomID (chatRoomId: string) {
      if (chatRoomId !== this.currentChatRoomId) {
        if (this.isDirectMessage(chatRoomId)) {
          sbp('state/vuex/commit', 'setCurrentChatRoomId', { chatRoomId })
        } else {
          const groupId = this.groupIdFromChatRoomId(chatRoomId)
          // NOTE: groupId could be undefined if the incorrect chatRoomId is passed
          if (groupId) {
            if (this.currentGroupId !== groupId) {
              sbp('state/vuex/commit', 'setCurrentGroupId', groupId)
            }
            sbp('state/vuex/commit', 'setCurrentChatRoomId', { groupId, chatRoomId })
          }
        }
      }
    }
  },
  watch: {
    'currentChatRoomId' (to: string, from: string) {
      if (to) {
        this.redirectChat('GroupChatConversation', to)
      }
    }
  }
}

export default ChatMixin
