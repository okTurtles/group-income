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
