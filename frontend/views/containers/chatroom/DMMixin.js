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
        let dmChatRoomId

        await sbp('gi.actions/identity/createDirectMessage', {
          contractID: identityContractID,
          data: { currentGroupId, memberIDs },
          hooks: {
            prepublish (message) {
              // When we create a DM, setting the chatroom ID directly is
              // problematic, because it'll trigger navigation but the contract
              // state may not be loaded yet. Therefore, we set an intermediary
              // state ('pending') and we'll set the chatroom ID when the
              // contract is loaded.
              // This is done in the JOINED_CHATROOM event.
              dmChatRoomId = message.contractID()
              sbp('state/vuex/commit', 'setPendingChatRoomId', { chatRoomID: dmChatRoomId, groupID: currentGroupId })
            }
          }
        })

        return dmChatRoomId
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
