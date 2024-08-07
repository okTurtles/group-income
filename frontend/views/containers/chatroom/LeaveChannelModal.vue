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
      'ourGroupDirectMessages',
      'isGroupDirectMessage'
    ]),
    ...mapState(['loggedIn', 'currentGroupId']),
    channelName () {
      if (!this.currentChatRoomState.attributes) {
        return ''
      } else if (this.isGroupDirectMessage(this.currentChatRoomId)) {
        return this.ourGroupDirectMessages[this.currentChatRoomId].title
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
        await sbp('gi.actions/group/leaveChatRoom', {
          contractID: this.currentGroupId,
          data: {
            chatRoomID: this.currentChatRoomId
          }
        })
        this.close()
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
