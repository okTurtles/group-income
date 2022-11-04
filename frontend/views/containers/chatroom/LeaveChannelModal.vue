<template lang='pug'>
  modal-template(ref='modal' :a11yTitle='L("Leave Channel")')
    template(slot='title')
      i18n Leave Channel

    form(novalidate @submit.prevent='' data-test='leaveChannel')
      i18n(
        tag='strong'
        :args='{ channelName: channelName }'
      ) Are you sure you want to leave {channelName}?

      i18n(
        tag='p'
      ) You will no longer be able to send or see messages in this channel.

      .buttons
        i18n.is-outlined(tag='button' @click='close') Cancel
        button-submit.is-danger(
          @click='submit'
          data-test='leaveChannelSubmit'
        ) {{ L('Leave Channel') }}
</template>

<script>
import sbp from '@sbp/sbp'
import { mapState, mapGetters } from 'vuex'
import ModalTemplate from '@components/modal/ModalTemplate.vue'
import ButtonSubmit from '@components/ButtonSubmit.vue'
import { CHATROOM_TYPES } from '@model/contracts/shared/constants.js'

export default ({
  name: 'LeaveChannelModal',
  components: {
    ModalTemplate,
    ButtonSubmit
  },
  computed: {
    ...mapGetters([
      'currentChatRoomId',
      'currentChatRoomState',
      'isDirectMessage',
      'currentIdentityState',
      'usernameFromDirectMessageID',
      'ourContactProfiles'
    ]),
    ...mapState(['loggedIn', 'currentGroupId']),
    channelName () {
      if (!this.currentChatRoomState.attributes) {
        return ''
      } else if (this.currentChatRoomState.attributes.type === CHATROOM_TYPES.INDIVIDUAL) {
        const username = this.usernameFromDirectMessageID(this.currentChatRoomId)
        return this.ourContactProfiles[username].displayName
      } else {
        return this.currentChatRoomState.attributes.name
      }
    }
  },
  methods: {
    close () {
      this.$refs.modal.close()
    },
    async submit () {
      try {
        if (this.isDirectMessage(this.currentChatRoomId)) {
          const mailboxID = this.currentIdentityState.attributes.mailbox
          const username = this.usernameFromDirectMessageID(this.currentChatRoomId)
          await sbp('gi.actions/mailbox/leaveDirectMessage', {
            contractID: mailboxID,
            data: { username }
          })
        } else {
          await sbp('gi.actions/group/leaveChatRoom', {
            contractID: this.currentGroupId,
            data: {
              chatRoomID: this.currentChatRoomId,
              member: this.loggedIn.username,
              leavingGroup: false
            }
          })
        }
      } catch (e) {
        console.error('LeaveChannelModal submit() error:', e)
      }
    }
  }
}: Object)
</script>

<style lang="scss" scoped>
@import "@assets/style/_variables.scss";

.c-banner {
  margin: 1.5rem 0;
}
</style>
