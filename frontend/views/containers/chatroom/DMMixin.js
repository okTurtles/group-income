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
    async createDirectMessage (usernames: string | string[]) {
      if (typeof usernames === 'string') {
        usernames = [usernames]
      }
      try {
        await sbp('gi.actions/identity/createDirectMessage', {
          contractID: this.ourIdentityContractId,
          data: { usernames },
          hooks: {
            onprocessed: (message) => {
              this.redirect(message.decryptedValue().data.contractID)
            }
          }
        })
      } catch (err) {
        alert(err.message)
      }
    },
    async setDMVisibility (chatRoomId: string, visible: boolean) {
      try {
        await sbp('gi.actions/identity/setDirectMessageVisibility', {
          contractID: this.ourIdentityContractId,
          data: { contractID: chatRoomId, visible }
        })
      } catch (err) {
        alert(err.message)
      }
    },
    redirect (chatRoomId: string) {
      this.$router.push({
        name: 'GroupChatConversation',
        params: { chatRoomId }
      }).catch(logExceptNavigationDuplicated)
    }
  }
}

export default DMMixin
