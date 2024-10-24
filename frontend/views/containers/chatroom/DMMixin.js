import sbp from '@sbp/sbp'
import { mapGetters, mapState } from 'vuex'
import { logExceptNavigationDuplicated } from '@view-utils/misc.js'
import { L } from '@common/common.js'

const DMMixin: Object = {
  computed: {
    ...mapGetters([
      'currentChatRoomId',
      'isGroupDirectMessage',
      'ourGroupDirectMessages',
      'ourIdentityContractId',
      'ourGroupDirectMessageFromUserIds'
    ]),
    ...mapState(['currentGroupId'])
  },
  methods: {
    async createDirectMessage (memberIDs: string | string[]) {
      if (typeof memberIDs === 'string') {
        memberIDs = [memberIDs]
      }
      try {
        const identityContractID = this.ourIdentityContractId
        const currentGroupId = this.currentGroupId
        await sbp('gi.actions/identity/createDirectMessage', {
          contractID: identityContractID,
          data: { currentGroupId, memberIDs },
          hooks: {
            prepublish (message) {
              sbp('state/vuex/commit', 'setPendingChatRoomId', { chatRoomID: message.contractID(), groupID: currentGroupId })
            }
          }
        })
      } catch (err) {
        console.error('[DMMixin.js] Failed to create a new chatroom', err)
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
