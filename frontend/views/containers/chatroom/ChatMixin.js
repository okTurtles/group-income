import sbp from '@sbp/sbp'
import { mapGetters, mapState } from 'vuex'
import { CHATROOM_PRIVACY_LEVEL, CHATROOM_TYPES, PROFILE_STATUS } from '@model/contracts/shared/constants.js'
import { logExceptNavigationDuplicated } from '@view-utils/misc.js'

const initSummary = {
  chatRoomID: undefined,
  title: '',
  picture: undefined,
  attributes: {},
  isPrivate: false,
  isDMToMySelf: false,
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
      'ourDirectMessages',
      'ourGroupDirectMessages',
      'chatRoomMembers',
      'groupGeneralChatRoomId',
      'groupChatRooms',
      'globalProfile',
      'isJoinedChatRoom',
      'ourContactProfilesById',
      'ourIdentityContractId',
      'isDirectMessage',
      'isGroupDirectMessage',
      'isGroupDirectMessageToMyself'
    ]),
    ...mapState(['currentGroupId']),
    summary (): Object {
      if (!this.isJoinedChatRoom(this.currentChatRoomId)) {
        return Object.assign({}, this.loadedSummary)
      }

      let title = this.currentChatRoomState.attributes.name
      let picture
      if (this.isGroupDirectMessage(this.currentChatRoomId)) {
        title = this.ourGroupDirectMessages[this.currentChatRoomId].title
        picture = this.ourGroupDirectMessages[this.currentChatRoomId].picture
      }
      const chatroomMemberKeys = Object.keys(this.currentChatRoomState.members)
      const isPrivate = this.currentChatRoomState.attributes.privacyLevel === CHATROOM_PRIVACY_LEVEL.PRIVATE
      const isDMToMySelf = isPrivate &&
        this.currentChatRoomState.attributes.type === CHATROOM_TYPES.DIRECT_MESSAGE &&
        chatroomMemberKeys.length === 1 &&
        chatroomMemberKeys[0] === this.ourIdentityContractId

      return {
        chatRoomID: this.currentChatRoomId,
        title,
        picture,
        attributes: Object.assign({}, this.currentChatRoomState.attributes),
        isPrivate,
        isDMToMySelf,
        isGeneral: this.groupGeneralChatRoomId === this.currentChatRoomId,
        isJoined: true,
        members: Object.fromEntries(chatroomMemberKeys.map(memberID => {
          const { displayName, picture, email } = this.globalProfile(memberID) || {}
          return [memberID, { ...this.currentChatRoomState.members[memberID], displayName, picture, email }]
        })),
        numberOfMembers: Object.values(this.currentChatRoomState.members).filter((member: Object) => !member.hasLeft).length,
        participants: this.ourContactProfilesById // TODO: return only historical contributors
      }
    }
  },
  methods: {
    redirectChat (chatRoomID: string) {
      // Temporarily blocked the chatrooms which the user is not part of
      // Need to open it later and display messages just like Slack

      // NOTE: for better understanding created a variable `shouldUseAlternative` instead of using !chatRoomID.
      //       to skip passing `chatRoomID` parameter means an intention to redirect to another chatroom
      //       this happens when the wrong (or cannot accessable) chatRoomID is used while opening group-chat URL
      const shouldUseAlternative = !chatRoomID
      if (shouldUseAlternative) {
        chatRoomID = this.isJoinedChatRoom(this.currentChatRoomId) ? this.currentChatRoomId : this.groupGeneralChatRoomId
      }

      this.$router.push({
        name: 'GroupChatConversation',
        params: { chatRoomID },
        query: !shouldUseAlternative ? { ...this.$route.query } : {}
      }).catch(logExceptNavigationDuplicated)
    },
    refreshTitle (title?: string): void {
      document.title = title || this.summary.title
    },
    loadLatestState (chatRoomID: string): void {
      const summarizedAttr = this.groupChatRooms[chatRoomID]
      if (summarizedAttr) {
        const { creator, name, description, type, privacyLevel, members } = summarizedAttr
        const activeMembers = Object.entries(members)
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
        if (this.isGroupDirectMessage(chatRoomID)) {
          sbp('state/vuex/commit', 'setCurrentChatRoomId', { chatRoomID })
        } else {
          const groupID = this.groupIdFromChatRoomId(chatRoomID)
          // NOTE: groupID could be undefined if the incorrect chatRoomID is passed
          if (groupID) {
            if (this.currentGroupId !== groupID) {
              sbp('state/vuex/commit', 'setCurrentGroupId', { contractID: groupID })
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
    },
    'ourGroupDirectMessages': {
      immediate: true,
      handler (to, from) {
        // NOTE: whenever any group members leave the group, and the ourGroupDirectMessage is changed
        //       we need to consider if currentChatRoomId needs to be changed
        //       if the currentChatRoomId (if it's DM) is no longer group direct message
        if (this.isDirectMessage(this.currentChatRoomId)) {
          if (this.currentGroupId) {
            const isNotGroupDirectMessage = !Object.keys(to).includes(this.currentChatRoomId)
            if (isNotGroupDirectMessage) {
              sbp('state/vuex/commit', 'setCurrentChatRoomId', { groupID: this.currentGroupId })
            }
          }
        }
      }
    }
  }
}

export default ChatMixin
