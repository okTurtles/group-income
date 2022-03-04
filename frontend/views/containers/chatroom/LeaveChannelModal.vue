<template lang='pug'>
  modal-template(ref='modal' :a11yTitle='L("Leave Channel")')
    template(slot='title')
      i18n Leave Channel

    form(novalidate @submit.prevent='' data-test='leaveChannel')
      i18n(
        tag='strong'
        :args='{ channelName: currentChatRoomState.attributes.name }'
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
import sbp from '~/shared/sbp.js'
import ModalTemplate from '@components/modal/ModalTemplate.vue'
import ButtonSubmit from '@components/ButtonSubmit.vue'
import { mapState, mapGetters } from 'vuex'

export default ({
  name: 'ChannelLeaveModal',
  components: {
    ModalTemplate,
    ButtonSubmit
  },
  computed: {
    ...mapGetters([
      'currentChatRoomState'
    ]),
    ...mapState([
      'currentChatRoomId',
      'loggedIn'
    ])
  },
  methods: {
    close () {
      this.$refs.modal.close()
    },
    async submit () {
      try {
        await sbp('gi.actions/chatroom/leave', {
          contractID: this.currentChatRoomId,
          data: { member: this.loggedIn.username }
        })
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
