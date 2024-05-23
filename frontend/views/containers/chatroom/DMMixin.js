import sbp from '@sbp/sbp'
import { mapGetters } from 'vuex'
import { logExceptNavigationDuplicated } from '@view-utils/misc.js'

const DMMixin: Object = {
  computed: {
    ...mapGetters([
      'currentChatRoomId',
      'isDirectMessage',
      'ourGroupDirectMessages',
      'ourIdentityContractId',
      'ourGroupDirectMessageFromUserIds'
    ])
  },
  methods: {
    async createDirectMessage (memberIDs: string | string[]) {
      if (typeof memberIDs === 'string') {
        memberIDs = [memberIDs]
      }
      try {
        await sbp('gi.actions/identity/createDirectMessage', {
          contractID: this.ourIdentityContractId,
          data: { memberIDs },
          hooks: {
            onprocessed: (message) => {
              const dmID = message.decryptedValue().data.contractID
              // The logic for updating paths will not work until the DM chatroom
              // has been synced
              sbp('chelonia/queueInvocation', dmID, () => this.redirect(dmID))
            }
          }
        })
      } catch (err) {
        alert(err.message)
      }
    },
    async setDMVisibility (chatRoomID: string, visible: boolean) {
      try {
        await sbp('gi.actions/identity/setDirectMessageVisibility', {
          contractID: this.ourIdentityContractId,
          data: { contractID: chatRoomID, visible }
        })
      } catch (err) {
        alert(err.message)
      }
    },
    redirect (chatRoomID: string) {
      this.$router.push({
        name: 'GroupChatConversation',
        params: { chatRoomID }
      }).catch(logExceptNavigationDuplicated)
    }
  }
}

export default DMMixin
