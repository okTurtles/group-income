import sbp from '@sbp/sbp'
import { mapGetters } from 'vuex'
import { CHATROOM_PRIVACY_LEVEL } from '@model/contracts/shared/constants.js'
import { logExceptNavigationDuplicated } from '@view-utils/misc.js'

const DMMixin: Object = {
  computed: {
    ...mapGetters([
      'currentChatRoomId',
      'ourUsername',
      'ourContacts',
      'ourContactProfiles',
      'isDirectMessage',
      'isPrivateDirectMessage',
      'isGroupDirectMessage',
      'ourPrivateDirectMessages',
      'ourGroupDirectMessages',
      'groupDirectMessageInfo',
      'directMessageIDFromUsername',
      'usernameFromDirectMessageID',
      'ourIdentityContractId'
    ])
  },
  methods: {
    getGroupDMByUsers (usernames: string[]) {
      return Object.keys(this.ourGroupDirectMessages).find(contractID => {
        const users = Object.keys(this.$store.state[contractID]?.users || {})
        if (users.length === usernames.length + 1) {
          return [...usernames, this.ourUsername].reduce((existing, un) => existing && users.includes(un), true)
        }
        return false
      })
    },
    getPrivateDMByUser (username: string) {
      return this.directMessageIDFromUsername(username)
    },
    createPrivateDM (username: string) {
      // NOTE: username should be valid
      sbp('gi.actions/identity/createDirectMessage', {
        contractID: this.ourIdentityContractId,
        data: {
          usernames: [username]
        }
      })
    },
    createGroupDM (usernames: string[]) {
      // NOTE: usernames.length should be gte 2
      sbp('gi.actions/identity/createDirectMessage', {
        contractID: this.ourIdentityContractId,
        data: {
          usernames
        }
      })
    },
    async addMemberToGroupDM (chatRoomId: string, username: string) {
      // NOTE: chatRoomId, username should be valid
      const profile = this.ourContactProfiles[username]
      await sbp('gi.actions/chatroom/join', {
        contractID: chatRoomId,
        data: { username }
      })
      await sbp('gi.actions/identity/joinDirectMessage', {
        contractID: profile.contractID,
        data: {
          contractID: chatRoomId
        }
      })
    },
    setDMVisibility (chatRoomId: string, hidden: boolean) {
      // NOTE: chatRoomId should be of valid direct message
      sbp('gi.actions/identity/setDirectMessageVisibility', {
        contractID: this.ourIdentityContractId,
        data: { contractID: chatRoomId, hidden }
      })
    },
    redirect (chatRoomId: string) {
      // NOTE: chatRoomId should be valid
      this.$router.push({
        name: 'GroupChatConversation',
        params: { chatRoomId }
      }).catch(logExceptNavigationDuplicated)
    }
  }
}

export default DMMixin
