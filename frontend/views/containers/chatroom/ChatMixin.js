import sbp from '@sbp/sbp'
import { mapGetters, mapState } from 'vuex'
import { CHATROOM_PRIVACY_LEVEL, PROFILE_STATUS } from '@model/contracts/shared/constants.js'
import { logExceptNavigationDuplicated } from '@view-utils/misc.js'

const initSummary = {
  chatRoomId: undefined,
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
    const { chatRoomId } = this.$route.params
    if (chatRoomId && this.isJoinedChatRoom(chatRoomId)) {
      this.refreshTitle()
      this.updateCurrentChatRoomID(chatRoomId)
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
      'generalChatRoomId',
      'getGroupChatRooms',
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
        chatRoomId: this.currentChatRoomId,
        title,
        picture,
        attributes: Object.assign({}, this.currentChatRoomState.attributes),
        isPrivate: this.currentChatRoomState.attributes.privacyLevel === CHATROOM_PRIVACY_LEVEL.PRIVATE,
        isGeneral: this.generalChatRoomId === this.currentChatRoomId,
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
    redirectChat (chatRoomId: string) {
      const name = 'GroupChatConversation'
      // Temporarily blocked the chatrooms which the user is not part of
      // Need to open it later and display messages just like Slack
      chatRoomId = chatRoomId || (this.isJoinedChatRoom(this.currentChatRoomId) ? this.currentChatRoomId : this.generalChatRoomId)

      this.$router.push({
        name,
        params: { chatRoomId },
        query: { ...this.$route.query }
      }).catch(logExceptNavigationDuplicated)
    },
    refreshTitle (title?: string): void {
      document.title = title || this.summary.title
    },
    loadLatestState (chatRoomId: string): void {
      const summarizedAttr = this.getGroupChatRooms[chatRoomId]
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
          chatRoomId,
          title: name,
          attributes: { creator, name, description, type, privacyLevel },
          members: activeMembers,
          numberOfMembers: activeMembers.length,
          participants: this.ourContactProfilesById // TODO: return only historical contributors
        }
        this.refreshTitle(name)
      } else {
        this.redirectChat()
      }
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
        this.redirectChat(to)
      }
    }
  }
}

export default ChatMixin
