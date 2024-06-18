import sbp from '@sbp/sbp'
import { mapGetters } from 'vuex'
import { logExceptNavigationDuplicated } from '@view-utils/misc.js'
import { L } from '@common/common.js'

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
        await sbp('gi.ui/prompt', {
          heading: L('Failed to create a new chatroom'),
          question: err.message,
          primaryButton: L('Close')
        })
      }
    },
    async setDMVisibility (chatRoomID: string, visible: boolean) {
      try {
        await sbp('gi.actions/identity/setDirectMessageVisibility', {
          contractID: this.ourIdentityContractId,
          data: { contractID: chatRoomID, visible }
        })
      } catch (err) {
        await sbp('gi.ui/prompt', {
          heading: L('Failed to change the chatroom settings'),
          question: err.message,
          primaryButton: L('Close')
        })
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
