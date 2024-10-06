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
        await sbp('gi.actions/identity/createDirectMessage', {
          contractID: identityContractID,
          currentGroupId: this.currentGroupId,
          data: { memberIDs },
          hooks: {
            onprocessed: (message) => {
              const dmID = message.decryptedValue().data.contractID
              // The logic for updating paths will not work until the DM chatroom
              // has been synced

              // Sometimes, the state may not be ready (it needs to be copied from the SW
              // to Vuex). In this case, we try again after a short delay.
              // The specific issue is that the browsing-side state is updated in response
              // to the EVENT_HANDLED event. That may happen after the onprocessed hook
              // TODO: Figure out a better way of doing this that doesn't require a timeout (for example, doing this directly is the GroupChat.vue file
              // `if (!this.isJoinedChatRoom(chatRoomID)) {` check)

              let attemptCount = 0
              const setCurrentChatRoomId = () => {
                // Re-grab the state as it could be a stale reference
                const rootState = sbp('state/vuex/state')
                if (!rootState[dmID]?.members?.[identityContractID]) {
                  if (++attemptCount > 5) {
                    console.warn('[createDirectMessage] Given up on redirect after 5 attempts', { identityContractID, dmID })
                    return
                  }
                  setTimeout(setCurrentChatRoomId, 5 + 5 * attemptCount)
                } else {
                  this.redirect(dmID)
                }
              }

              sbp('chelonia/queueInvocation', dmID, setCurrentChatRoomId)
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
