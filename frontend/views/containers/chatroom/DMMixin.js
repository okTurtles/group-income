import sbp from '@sbp/sbp'
import { mapGetters } from 'vuex'
import { logExceptNavigationDuplicated } from '@view-utils/misc.js'

const DMMixin: Object = {
  computed: {
    ...mapGetters([
      'currentChatRoomId',
      'ourUsername',
      'ourContacts',
      'ourContactProfiles',
      'isDirectMessage',
      'ourGroupDirectMessages',
      'ourIdentityContractId',
      'ourGroupDirectMessageFromUsernames'
    ])
  },
  methods: {
    createDirectMessage (usernames: string | string[]) {
      if (typeof usernames === 'string') {
        usernames = [usernames]
      }
      // NOTE: username should be valid
      sbp('gi.actions/identity/createDirectMessage', {
        contractID: this.ourIdentityContractId,
        data: { usernames }
      })
    },
    async addMemberToDirectMessage (chatRoomId: string, username: string) {
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
    setDMVisibility (chatRoomId: string, visible: boolean) {
      sbp('gi.actions/identity/setDirectMessageVisibility', {
        contractID: this.ourIdentityContractId,
        data: { contractID: chatRoomId, visible }
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
