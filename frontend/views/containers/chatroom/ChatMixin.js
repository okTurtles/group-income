import sbp from '@sbp/sbp'
import { mapGetters, mapState } from 'vuex'
import { CHATROOM_PRIVACY_LEVEL, PROFILE_STATUS } from '@model/contracts/shared/constants.js'
import { logExceptNavigationDuplicated } from '@view-utils/misc.js'

const initSummary = {
  chatRoomID: undefined,
  title: '',
  picture: undefined,
  attributes: {},
  isPrivate: false,
  isGeneral: false,
  isJoined: false,
  members: {},
  numberOfMembers: 0,
  participants: []
}

const ChatMixin: Object = {
  data (): Object {
    return {
      loadedSummary: initSummary
    }
  },
  mounted () {
    const { chatRoomID } = this.$route.params
    if (chatRoomID && this.isJoinedChatRoom(chatRoomID)) {
      this.refreshTitle()
      this.updateCurrentChatRoomID(chatRoomID)
    } else {
      this.redirectChat()
    }
  },
  computed: {
    ...mapGetters([
      'currentChatRoomId',
      'currentChatRoomState',
      'currentGroupState',
      'groupIdFromChatRoomId',
      'ourGroupDirectMessages',
      'chatRoomMembers',
      'groupGeneralChatRoomId',
      'groupChatRooms',
      'globalProfile',
      'isJoinedChatRoom',
      'ourContactProfilesById',
      'isDirectMessage'
    ]),
    ...mapState(['currentGroupId']),
    summary (): Object {
      if (!this.isJoinedChatRoom(this.currentChatRoomId)) {
        return Object.assign({}, this.loadedSummary)
      }

      let title = this.currentChatRoomState.attributes.name
      let picture
      if (this.isDirectMessage(this.currentChatRoomId)) {
        title = this.ourGroupDirectMessages[this.currentChatRoomId].title
        picture = this.ourGroupDirectMessages[this.currentChatRoomId].picture
      }

      return {
        chatRoomID: this.currentChatRoomId,
        title,
        picture,
        attributes: Object.assign({}, this.currentChatRoomState.attributes),
        isPrivate: this.currentChatRoomState.attributes.privacyLevel === CHATROOM_PRIVACY_LEVEL.PRIVATE,
        isGeneral: this.groupGeneralChatRoomId === this.currentChatRoomId,
        isJoined: true,
        members: Object.fromEntries(Object.keys(this.currentChatRoomState.members).map(memberID => {
          const { displayName, picture, email } = this.globalProfile(memberID) || {}
          return [memberID, { ...this.currentChatRoomState.members[memberID], displayName, picture, email }]
        })),
        numberOfMembers: Object.keys(this.currentChatRoomState.members).length,
        participants: this.ourContactProfilesById // TODO: return only historical contributors
      }
    }
  },
  methods: {
    redirectChat (chatRoomID: string) {
      const name = 'GroupChatConversation'
      // Temporarily blocked the chatrooms which the user is not part of
      // Need to open it later and display messages just like Slack
      chatRoomID = chatRoomID || (this.isJoinedChatRoom(this.currentChatRoomId) ? this.currentChatRoomId : this.groupGeneralChatRoomId)

      this.$router.push({
        name,
        params: { chatRoomID },
        query: { ...this.$route.query }
      }).catch(logExceptNavigationDuplicated)
    },
    refreshTitle (title?: string): void {
      document.title = title || this.summary.title
    },
    loadLatestState (chatRoomID: string): void {
      const summarizedAttr = this.groupChatRooms[chatRoomID]
      if (summarizedAttr) {
        const { creator, name, description, type, privacyLevel, members } = summarizedAttr
        const activeMembers = Object
          .entries(members)
          .filter(([, profile]) => (profile: any)?.status === PROFILE_STATUS.ACTIVE)
          .map(([username]) => {
            const { displayName, picture, email } = this.globalProfile(username) || {}
            return [username, { displayName, picture, email }]
          })

        this.loadedSummary = {
          ...initSummary,
          chatRoomID,
          title: name,
          attributes: { creator, name, description, type, privacyLevel },
          members: activeMembers,
          pinnedMessages: [],
          numberOfMembers: activeMembers.length,
          participants: this.ourContactProfilesById // TODO: return only historical contributors
        }
        this.refreshTitle(name)
      } else {
        this.redirectChat()
      }
    },
    updateCurrentChatRoomID (chatRoomID: string) {
      if (chatRoomID !== this.currentChatRoomId) {
        if (this.isDirectMessage(chatRoomID)) {
          sbp('state/vuex/commit', 'setCurrentChatRoomId', { chatRoomID })
        } else {
          const groupID = this.groupIdFromChatRoomId(chatRoomID)
          // NOTE: groupID could be undefined if the incorrect chatRoomID is passed
          if (groupID) {
            if (this.currentGroupId !== groupID) {
              sbp('state/vuex/commit', 'setCurrentGroupId', groupID)
            }
            sbp('state/vuex/commit', 'setCurrentChatRoomId', { groupID, chatRoomID })
          }
        }
      }
    }
  },
  watch: {
    'currentChatRoomId' (to: string, from: string) {
      if (to) {
        this.redirectChat(to)
      }
    }
  }
}

export default ChatMixin
